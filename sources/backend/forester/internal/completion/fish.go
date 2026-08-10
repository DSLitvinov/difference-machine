package completion

import (
	"fmt"
	"strings"
)

func fishScript() string {
	words := strings.Join(CommandNames(), " ")
	return fmt.Sprintf("# fish completion for forester\n\ncomplete -c forester -f -n '__fish_use_subcommand' -a %q\n", words)
}
