package completion

import (
	"fmt"
	"strings"
)

func bashScript() string {
	words := strings.Join(CommandNames(), " ")
	return fmt.Sprintf(`# bash completion for forester

_forester() {
    local cur
    cur="${COMP_WORDS[COMP_CWORD]}"
    if [[ $COMP_CWORD -eq 1 && $cur != -* ]]; then
        COMPREPLY=( $(compgen -W %q -- "$cur") )
    fi
}

complete -F _forester forester
`, words)
}
