package cli

import (
	"fmt"
	"os"
	"sync"
	"time"
)

// consoleLogger implements jsrt.Logger against stderr with a lightweight,
// single-line progress indicator.
type consoleLogger struct {
	mu       sync.Mutex
	debug    bool
	quiet    bool
	progress bool
	lastLine int
	start    time.Time
}

func newConsoleLogger(debug, quiet bool) *consoleLogger {
	return &consoleLogger{debug: debug, quiet: quiet, start: time.Now()}
}

func (l *consoleLogger) clearProgress() {
	if l.lastLine > 0 {
		fmt.Fprint(os.Stderr, "\r\033[K")
		l.lastLine = 0
	}
}

func (l *consoleLogger) Debug(m string) {
	if !l.debug {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.clearProgress()
	fmt.Fprintf(os.Stderr, "  · %s\n", m)
}

func (l *consoleLogger) Warn(m string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.clearProgress()
	if !l.quiet {
		fmt.Fprintf(os.Stderr, "  ! %s\n", m)
	}
}

func (l *consoleLogger) Notify(title, message string) {
	if l.quiet {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.clearProgress()
	if title != "" {
		fmt.Fprintf(os.Stderr, "  ! %s: %s\n", title, message)
	} else {
		fmt.Fprintf(os.Stderr, "  ! %s\n", message)
	}
}

func (l *consoleLogger) Progress(done, total int) {
	if l.quiet || total == 0 {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	line := fmt.Sprintf("\r  scanning %d/%d services  (%s)", done, total,
		time.Since(l.start).Round(time.Second))
	fmt.Fprint(os.Stderr, "\033[K"+line)
	l.lastLine = len(line)
	if done >= total {
		fmt.Fprintln(os.Stderr)
		l.lastLine = 0
	}
}
