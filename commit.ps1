# PowerShell script to add and commit AureSpend project files
# This script commits the complete AureSpend KES Vault <-> USDCx implementation on Stacks

# Get the list of untracked files
$untrackedFiles = (git ls-files --others --exclude-standard) -split '\r\n|\n|\r' | Where-Object { $_ -ne "" }

# Get the list of modified files (staged and unstaged)
$modifiedUnstaged = (git diff --name-only) -split '\r\n|\n|\r' | Where-Object { $_ -ne "" }
$modifiedStaged = (git diff --cached --name-only) -split '\r\n|\n|\r' | Where-Object { $_ -ne "" }
$modifiedFiles = ($modifiedUnstaged + $modifiedStaged) | Select-Object -Unique

# Combine all files to commit
$allFiles = ($untrackedFiles + $modifiedFiles) | Select-Object -Unique

# Comprehensive commit message for AureSpend project
$commitMessage = "AureSpend delivery: KES Vault <-> USDCx settlement platform on Stacks. Includes production-oriented docs, Clarity vault contracts (role-based controls, replay protection, pause/emergency safeguards), Node.js/TypeScript backend (MongoDB + Redis/BullMQ queues, KES Vault integration adapters, settlement orchestration), and React/Vite client flows (top-up/spend UX, wallet integration, typed API services, resilient polling)."

# Commit each file individually
foreach ($file in $allFiles) {
    if ($file -ne "") {
        git add $file
        git commit --only $file -m "$commitMessage - $file"
    }
}

# Push all commits
git push  origin main