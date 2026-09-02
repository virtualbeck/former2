package awsclient

import (
	"strconv"

	"github.com/virtualbeck/former2/tfcli/internal/awsmodel"
)

// xmlDecoder walks a generic xmlNode tree against an aws-sdk-js output shape,
// producing the same loosely-typed map[string]interface{} the browser SDK
// would hand to former2's mapping code.
type xmlDecoder struct {
	api *awsmodel.API
	ec2 bool // ec2 query flavour (lists are wrapped, member locationName "item")
}

func scalar(text, typ string) interface{} {
	switch typ {
	case "boolean":
		return text == "true" || text == "1"
	case "integer", "long":
		if v, err := strconv.ParseInt(text, 10, 64); err == nil {
			return v
		}
		return text
	case "float", "double":
		if v, err := strconv.ParseFloat(text, 64); err == nil {
			return v
		}
		return text
	default:
		return text
	}
}

func memberElemName(name string, s *awsmodel.Shape) string {
	if s != nil && s.LocationName != "" {
		return s.LocationName
	}
	return name
}

// structVal decodes the children of `parent` as the members of struct shape `s`.
func (d *xmlDecoder) structVal(parent *xmlNode, s *awsmodel.Shape) map[string]interface{} {
	out := map[string]interface{}{}
	if parent == nil || s == nil {
		return out
	}
	for name, rawM := range s.Members {
		m := d.api.Deref(rawM)
		elem := memberElemName(name, rawM)
		switch m.EffType() {
		case "list":
			arr := d.listVal(parent, name, rawM, m)
			if arr != nil {
				out[name] = arr
			}
		case "map":
			mp := d.mapVal(parent.child(elem), m)
			if mp != nil {
				out[name] = mp
			}
		case "structure":
			if c := parent.child(elem); c != nil {
				out[name] = d.structVal(c, m)
			}
		default:
			if c := parent.child(elem); c != nil {
				out[name] = scalar(c.trimmedText(), m.EffType())
			}
		}
	}
	return out
}

// listVal collects the elements of a list member sitting under `parent`.
func (d *xmlDecoder) listVal(parent *xmlNode, name string, rawM, listShape *awsmodel.Shape) []interface{} {
	flattened := listShape.Flattened
	elem := memberElemName(name, rawM)
	memberShape := d.api.Deref(listShape.Member)

	var items []*xmlNode
	if flattened {
		items = parent.childrenNamed(elem)
	} else {
		wrap := parent.child(elem)
		if wrap == nil {
			return nil
		}
		mn := "member"
		if listShape.Member != nil && listShape.Member.LocationName != "" {
			mn = listShape.Member.LocationName
		} else if d.ec2 {
			mn = "item"
		}
		items = wrap.childrenNamed(mn)
	}
	if items == nil {
		return nil
	}
	arr := make([]interface{}, 0, len(items))
	for _, it := range items {
		arr = append(arr, d.value(it, memberShape))
	}
	return arr
}

func (d *xmlDecoder) mapVal(node *xmlNode, mapShape *awsmodel.Shape) map[string]interface{} {
	if node == nil {
		return nil
	}
	keyName := "key"
	valName := "value"
	if mapShape.Key != nil && mapShape.Key.LocationName != "" {
		keyName = mapShape.Key.LocationName
	}
	if mapShape.Value != nil && mapShape.Value.LocationName != "" {
		valName = mapShape.Value.LocationName
	}
	valShape := d.api.Deref(mapShape.Value)
	entries := node.Children
	if !mapShape.Flattened {
		entries = node.childrenNamed("entry")
		if len(entries) == 0 {
			entries = node.Children
		}
	}
	out := map[string]interface{}{}
	for _, e := range entries {
		k := e.child(keyName)
		v := e.child(valName)
		if k == nil {
			continue
		}
		if v == nil {
			out[k.trimmedText()] = nil
			continue
		}
		out[k.trimmedText()] = d.value(v, valShape)
	}
	return out
}

func (d *xmlDecoder) value(n *xmlNode, s *awsmodel.Shape) interface{} {
	s = d.api.Deref(s)
	if s == nil {
		return n.trimmedText()
	}
	switch s.EffType() {
	case "structure":
		return d.structVal(n, s)
	case "list":
		// nested list: `n` itself is the wrapper containing members
		mn := "member"
		if s.Member != nil && s.Member.LocationName != "" {
			mn = s.Member.LocationName
		} else if d.ec2 {
			mn = "item"
		}
		items := n.childrenNamed(mn)
		memberShape := d.api.Deref(s.Member)
		arr := make([]interface{}, 0, len(items))
		for _, it := range items {
			arr = append(arr, d.value(it, memberShape))
		}
		return arr
	case "map":
		return d.mapVal(n, s)
	default:
		return scalar(n.trimmedText(), s.EffType())
	}
}
