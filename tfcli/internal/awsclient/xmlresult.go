package awsclient

import (
	"bytes"

	"github.com/virtualbeck/former2/tfcli/internal/awsmodel"
)

// decodeXML turns a query / ec2 / rest-xml response body into former2's
// loosely-typed map, guided by the operation's output shape.
func decodeXML(api *awsmodel.API, op *awsmodel.Operation, body []byte) (map[string]interface{}, error) {
	root, err := parseXML(bytes.TrimSpace(body))
	if err != nil {
		return nil, err
	}
	if root == nil {
		return map[string]interface{}{}, nil
	}
	output := api.Deref(op.Output)
	dec := &xmlDecoder{api: api, ec2: api.Metadata.Protocol == "ec2"}

	switch api.Metadata.Protocol {
	case "query":
		// <OpResponse><OpResult>...</OpResult><ResponseMetadata/></OpResponse>
		resultNode := root.child(op.Name + "Result")
		if resultNode == nil && output != nil && output.ResultWrapper != "" {
			resultNode = root.child(output.ResultWrapper)
		}
		if resultNode == nil {
			resultNode = root
		}
		if output == nil {
			return map[string]interface{}{}, nil
		}
		return dec.structVal(resultNode, output), nil

	case "ec2":
		// <OpResponse> ...fields... <requestId/></OpResponse>
		if output == nil {
			return map[string]interface{}{}, nil
		}
		return dec.structVal(root, output), nil

	default: // rest-xml
		if output == nil {
			return map[string]interface{}{}, nil
		}
		// If the output has a structure payload member, the root element maps
		// to that member's shape.
		if output.Payload != "" {
			if pm, ok := api.Member(output, output.Payload); ok && pm.EffType() == "structure" {
				return map[string]interface{}{output.Payload: dec.structVal(root, pm)}, nil
			}
		}
		return dec.structVal(root, output), nil
	}
}
