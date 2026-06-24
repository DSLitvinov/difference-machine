export const DEFAULT_DFMIGNORE_TEMPLATE = `# Forester ignore file
# Similar to .gitignore

# OS files
.DS_Store
Thumbs.db
desktop.ini

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build artifacts
build/
*.o
*.a
*.so
*.dylib
*.dll
*.exe

# Temporary files
*.tmp
*.log
*.cache

# Blender
*.blend1
*.blend2

# Unity
Library/
Temp/
Obj/
*.csproj
*.sln

# Unreal
Binaries/
Intermediate/
Saved/
DerivedDataCache/
`;

export type InitRepositoryWizardStep = "confirm" | "author" | "ignore";

export interface InitRepositoryOptions {
  author: string;
  dfmignore: string;
}
