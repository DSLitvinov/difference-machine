Forester Commands (Short)
=========================

Strict CLI validation:
- Unknown flags are errors.
- Extra positional arguments are errors.
- Flags that require values must receive them.
- Mutually exclusive flags are rejected.

Core commands
-------------
- `forester init [path]`
- `forester status [--short|-s] [--color|--color=always|--color=never|--no-color]`
- `forester add <path>...` or `forester add -u|--update [<path>...]`
- `forester commit "message" [--author <name>] [--tag <name>] [--no-verify] [-a|--all] [--amend] [--no-edit]`
- `forester rm <path>...` or `forester rm -r|--recursive <dir>`
- `forester drop <path>...` or `forester drop -r|--recursive <dir>`
- `forester mv <old> <new>`
- `forester branch [-v|--verbose] | <name> | -d|--delete <name> | -m|--move|--rename <old> <new>`
- `forester switch <branch|commit> [-a|--auto-stash]`
- `forester log [<branch>] [options]`
- `forester show <commit> | <commit>:<file> [--stat]`
- `forester diff [<commit1> [commit2]] [options] | <commit>:<file> | --cached|--staged`
- `forester restore <file>... | --staged <file>... | --source=<commit> <file>...`
- `forester reset [--soft|--mixed|--hard] <commit>`
- `forester revert <commit>`
- `forester cherry-pick <commit>`
- `forester merge <branch> [options] | --abort | --continue`
- `forester move-to <base-branch>`
- `forester tag | -d|--delete <name> | -a|--annotate -m <message> <name>`
- `forester stash [list|save|pop|apply|drop|show|clear|branch] [...]`
- `forester clean -l|--list | -n|--dry-run | -f|--force | -d|--dirs`
- `forester gc [--dry-run|-n] [--reflog-expire <days>]`
- `forester hook [list|install|remove] [...]`
- `forester lock [list|unlock] <file> | <file> [--shared|--exclusive] [--expire <hours>]`
- `forester config --list | --global <key> <value>`
- `forester compare <full_hash> [full_hash] [--cleanup] [--editor <path>]`
- `forester rebuild`
- `forester review <comment|list|approve|reject|resolve> [...]`
- `forester lol`

Key rules
---------
- `commit -m/--message` is not supported.
- `commit --no-edit` requires `--amend`.
- `restore --staged` and `restore --source` are mutually exclusive.
- `reset --soft/--mixed/--hard` are mutually exclusive.
- `merge --abort/--continue` cannot be combined with other options.
- `merge --no-ff` and `--ff-only` are mutually exclusive.
- `merge --squash` and `--no-commit` are mutually exclusive.
- `log --all` cannot be combined with a branch argument.
- `log --name-only` and `--name-status` are mutually exclusive.
- `diff --cached` cannot be combined with commit arguments.
- `clean --dry-run` and `--force` are mutually exclusive.
- `lock --shared` and `--exclusive` are mutually exclusive.
- `compare` requires full 64-character commit hashes.

Common errors
-------------
- `unknown flag: --foo`
- `unexpected argument: <arg>`
- `flag <name> requires a value`
