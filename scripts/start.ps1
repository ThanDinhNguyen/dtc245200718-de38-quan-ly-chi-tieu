param([switch]$BaseOnly)
$ErrorActionPreference='Stop'
$taskCommand='cd /home/lam/projects/de38-quan-ly-chi-tieu && sh scripts/start.sh'
if($BaseOnly){$taskCommand='cd /home/lam/projects/de38-quan-ly-chi-tieu && BASE_ONLY=1 sh scripts/start.sh'}
wsl.exe -d Ubuntu-Lam -- bash -lc $taskCommand
if($LASTEXITCODE -ne 0){throw 'Không khởi động được đề 38 trong Ubuntu-Lam.'}
Write-Host 'Giữ cửa sổ Ubuntu-Lam mở trong buổi demo. Website: http://localhost:8038'
