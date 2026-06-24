package install

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/difference-machine/gui/internal/config"
)

const (
	installFolderName      = "Difference Machine"
	macDefaultRoot           = "/Applications/" + installFolderName
	macFlatLegacyRoot        = "/Applications"
	macLegacyInstallRoot     = "/Applications/DiffMachine"
	foresterAppName          = "Forester.app"
	foresterCLIBinInside     = "Contents/Resources/bin/forester"
	foresterCLILauncher      = "Contents/MacOS/Forester"
	addonRelative            = "addons/blender/difference_machine"
	apiLibInside             = "Contents/Frameworks/libforester.dylib"
	portableCLIRelative      = "bin"
	portableLibRelative      = "lib"
)

// ToolchainPaths are absolute paths written to ~/.dfm/setup.cfg after a packaged install.
type ToolchainPaths struct {
	ForesterCLI string
	APILib      string
	AddonDir    string
}

// BootstrapConfig fills missing Forester toolchain paths from a packaged install layout.
func BootstrapConfig(store *config.Store) error {
	if store == nil {
		return nil
	}
	switch runtime.GOOS {
	case "darwin", "windows":
	default:
		return nil
	}
	if !store.NeedsForesterBootstrap() {
		return nil
	}

	paths, ok := DetectToolchainPaths()
	if !ok {
		return nil
	}
	return store.SetInstallToolchainPaths(paths.ForesterCLI, paths.APILib, paths.AddonDir)
}

// DetectToolchainPaths locates Forester CLI, API library, and the Blender addon directory.
func DetectToolchainPaths() (ToolchainPaths, bool) {
	for _, root := range candidateInstallRoots() {
		if paths, ok := detectToolchainAtRoot(root); ok {
			return paths, true
		}
	}
	return ToolchainPaths{}, false
}

func detectToolchainAtRoot(root string) (ToolchainPaths, bool) {
	if runtime.GOOS == "darwin" {
		if paths, ok := macToolchainAtRoot(root); ok {
			return paths, true
		}
	}
	return portableToolchainAtRoot(root)
}

func candidateInstallRoots() []string {
	seen := make(map[string]struct{})
	var roots []string

	add := func(root string) {
		root = strings.TrimSpace(root)
		if root == "" {
			return
		}
		if _, ok := seen[root]; ok {
			return
		}
		seen[root] = struct{}{}
		roots = append(roots, root)
	}

	if root, ok := installRootFromExecutable(); ok {
		add(root)
	}

	switch runtime.GOOS {
	case "darwin":
		add(macDefaultRoot)
		add(macFlatLegacyRoot)
		add(macLegacyInstallRoot)
	case "windows":
		if programFiles := os.Getenv("ProgramFiles"); programFiles != "" {
			add(filepath.Join(programFiles, installFolderName))
		}
		if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
			add(filepath.Join(localAppData, "Programs", installFolderName))
		}
	}

	return roots
}

func installRootFromExecutable() (string, bool) {
	execPath, err := os.Executable()
	if err != nil {
		return "", false
	}
	execPath, err = filepath.EvalSymlinks(execPath)
	if err != nil {
		return "", false
	}

	if runtime.GOOS == "darwin" {
		marker := ".app/Contents/MacOS/"
		idx := strings.Index(execPath, marker)
		if idx < 0 {
			return "", false
		}
		appBundle := execPath[:idx+len(".app")]
		root := filepath.Dir(appBundle)
		if layoutLooksValid(root) {
			return root, true
		}
		return "", false
	}

	root := filepath.Dir(execPath)
	if layoutLooksValid(root) {
		return root, true
	}
	return "", false
}

func macToolchainAtRoot(root string) (ToolchainPaths, bool) {
	cli := filepath.Join(root, foresterAppName, foresterCLIBinInside)
	api := filepath.Join(root, foresterAppName, apiLibInside)

	if st, err := os.Stat(cli); err != nil || st.IsDir() {
		cli = filepath.Join(root, foresterAppName, foresterCLILauncher)
		if st, err := os.Stat(cli); err != nil || st.IsDir() {
			legacy := filepath.Join(root, foresterAppName, "Contents/MacOS/forester")
			if st, err := os.Stat(legacy); err != nil || st.IsDir() {
				return ToolchainPaths{}, false
			}
			cli = legacy
		}
	}

	addon, ok := resolveAddonDir(root)
	if !ok {
		return ToolchainPaths{}, false
	}

	out := ToolchainPaths{
		ForesterCLI: cli,
		AddonDir:    addon,
	}
	if st, err := os.Stat(api); err == nil && !st.IsDir() {
		out.APILib = api
	}
	return out, true
}

func portableToolchainAtRoot(root string) (ToolchainPaths, bool) {
	cliName, apiName := portableBinaryNames()

	cli := filepath.Join(root, portableCLIRelative, cliName)
	if st, err := os.Stat(cli); err != nil || st.IsDir() {
		return ToolchainPaths{}, false
	}

	addon, ok := resolveAddonDir(root)
	if !ok {
		return ToolchainPaths{}, false
	}

	out := ToolchainPaths{
		ForesterCLI: cli,
		AddonDir:    addon,
	}
	api := filepath.Join(root, portableLibRelative, apiName)
	if st, err := os.Stat(api); err == nil && !st.IsDir() {
		out.APILib = api
	}
	return out, true
}

func portableBinaryNames() (cliName, apiName string) {
	switch runtime.GOOS {
	case "windows":
		return "forester.exe", "forester.dll"
	case "darwin":
		return "forester", "libforester.dylib"
	default:
		return "forester", "libforester.so"
	}
}

func layoutLooksValid(root string) bool {
	_, ok := detectToolchainAtRoot(root)
	return ok
}
