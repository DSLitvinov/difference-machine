# Shared PATH setup for local dev tools (Go, Homebrew).
# Source this file: . "${SCRIPT_DIR}/lib/setup_dev_path.sh"

setup_dev_path() {
    local dir

    if command -v go >/dev/null 2>&1; then
        dir="$(go env GOPATH 2>/dev/null)/bin"
        if [ -n "${dir}" ] && [ -d "${dir}" ]; then
            case ":${PATH}:" in
                *:"${dir}":*) ;;
                *) PATH="${dir}:${PATH}" ;;
            esac
        fi

        dir="$(go env GOROOT 2>/dev/null)/bin"
        if [ -n "${dir}" ] && [ -d "${dir}" ]; then
            case ":${PATH}:" in
                *:"${dir}":*) ;;
                *) PATH="${dir}:${PATH}" ;;
            esac
        fi
    fi

    if [ "$(uname -s)" = "Darwin" ]; then
        for dir in /opt/homebrew/bin /opt/homebrew/sbin /usr/local/bin /usr/local/sbin; do
            if [ -d "${dir}" ]; then
                case ":${PATH}:" in
                    *:"${dir}":*) ;;
                    *) PATH="${dir}:${PATH}" ;;
                esac
            fi
        done
    fi

    export PATH
}

require_command() {
    local name="$1"
    local hint="${2:-}"

    if command -v "${name}" >/dev/null 2>&1; then
        return 0
    fi

    echo "Required command not found: ${name}" >&2
    if [ -n "${hint}" ]; then
        echo "${hint}" >&2
    fi
    return 1
}
