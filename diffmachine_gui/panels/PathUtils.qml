import QtQuick 6.6
import RepositoryManager 1.0

Item {
    id: pathUtils
    
    // Property to receive repositoryManager
    property var repositoryManager: null
    
    // Make component invisible
    visible: false
    
    /**
     * Converts an absolute file path to a repository-relative path.
     * @param fullPath - The absolute file path
     * @return The relative path from repository root, or empty string if path is not within repository
     */
    function toRepoRelativePath(fullPath) {
        if (!fullPath || !repositoryManager || !repositoryManager.currentRepository) {
            return ""
        }
        var root = String(repositoryManager.currentRepository)
        var normalizedRoot = root.endsWith("/") ? root.slice(0, -1) : root
        if (String(fullPath).indexOf(normalizedRoot + "/") === 0) {
            return String(fullPath).slice(normalizedRoot.length + 1)
        }
        return ""
    }
    
    /**
     * Checks if a status list contains a given file path.
     * Checks both absolute and relative paths.
     * @param statusList - Array of file paths from status
     * @param fullPath - The file path to check
     * @return true if path is found in the list, false otherwise
     */
    function statusListHasPath(statusList, fullPath) {
        if (!statusList || !fullPath) {
            return false
        }
        var path = String(fullPath)
        var relPath = toRepoRelativePath(path)
        if (statusList.indexOf(path) !== -1) {
            return true
        }
        if (relPath && statusList.indexOf(relPath) !== -1) {
            return true
        }
        return false
    }
    
    /**
     * Normalizes a file path to absolute path within repository.
     * If path is already absolute and within repo, returns as is.
     * If path is relative, combines with repository root.
     * @param pathValue - The path to normalize (can be absolute or relative)
     * @return Normalized absolute path
     */
    function normalizeStatusPath(pathValue) {
        if (!pathValue) {
            return ""
        }
        var path = String(pathValue)
        if (repositoryManager && repositoryManager.currentRepository) {
            var root = String(repositoryManager.currentRepository)
            var normalizedRoot = root.endsWith("/") ? root.slice(0, -1) : root
            if (path.indexOf(normalizedRoot + "/") === 0) {
                return path
            }
            if (path.indexOf("/") !== 0) {
                return normalizedRoot + "/" + path
            }
        }
        return path
    }
    
    /**
     * Formats a path for display in status lists.
     * Converts absolute paths to relative paths for cleaner display.
     * @param pathValue - The path to format (can be absolute or relative)
     * @return Display-friendly relative path
     */
    function displayPathForStatus(pathValue) {
        if (!pathValue) {
            return ""
        }
        var path = normalizeStatusPath(pathValue)
        if (repositoryManager && repositoryManager.currentRepository) {
            var root = String(repositoryManager.currentRepository)
            var normalizedRoot = root.endsWith("/") ? root.slice(0, -1) : root
            if (path.indexOf(normalizedRoot + "/") === 0) {
                return path.slice(normalizedRoot.length + 1)
            }
        }
        return String(pathValue)
    }
    
    /**
     * Converts a relative path to absolute path within repository.
     * @param relativePath - The relative path
     * @return Absolute path, or original path if already absolute
     */
    function toAbsolutePath(relativePath) {
        if (!relativePath || !repositoryManager || !repositoryManager.currentRepository) {
            return relativePath || ""
        }
        var root = String(repositoryManager.currentRepository)
        var normalizedRoot = root.endsWith("/") ? root.slice(0, -1) : root
        // If path is already absolute and starts with repo root, return as is
        if (String(relativePath).indexOf(normalizedRoot + "/") === 0 || String(relativePath) === normalizedRoot) {
            return String(relativePath)
        }
        // Otherwise, combine repo root with relative path
        return normalizedRoot + "/" + String(relativePath)
    }
}
