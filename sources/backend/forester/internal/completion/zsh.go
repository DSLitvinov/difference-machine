package completion

import (
	"fmt"
	"strings"
)

func zshScript() string {
	var b strings.Builder
	b.WriteString("#compdef forester\n\n")
	b.WriteString("_forester() {\n")
	b.WriteString("    local -a commands\n")
	b.WriteString("    commands=(\n")
	for _, name := range CommandNames() {
		fmt.Fprintf(&b, "        %q\n", name)
	}
	b.WriteString("    )\n")
	b.WriteString("    if (( CURRENT == 2 )); then\n")
	b.WriteString("        _describe 'command' commands\n")
	b.WriteString("    fi\n")
	b.WriteString("}\n\n")
	b.WriteString("_forester \"$@\"\n")
	return b.String()
}
