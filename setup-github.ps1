# GitHub 仓库设置脚本
# 使用方法: .\setup-github.ps1 -RepoName "CloudFlareBridge" -IsPrivate $false

param(
    [Parameter(Mandatory=$true)]
    [string]$RepoName,
    
    [Parameter(Mandatory=$false)]
    [string]$GitHubUsername = "",
    
    [Parameter(Mandatory=$false)]
    [bool]$IsPrivate = $false
)

Write-Host "正在设置 GitHub 仓库..." -ForegroundColor Green

# 如果没有提供用户名，尝试从 git config 获取
if ([string]::IsNullOrEmpty($GitHubUsername)) {
    $GitHubUsername = git config user.name
    if ([string]::IsNullOrEmpty($GitHubUsername)) {
        Write-Host "错误: 无法获取 GitHub 用户名，请手动提供" -ForegroundColor Red
        exit 1
    }
}

$remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"

Write-Host "仓库 URL: $remoteUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "请按照以下步骤操作:" -ForegroundColor Cyan
Write-Host "1. 访问 https://github.com/new" -ForegroundColor White
Write-Host "2. 仓库名称设置为: $RepoName" -ForegroundColor White
if ($IsPrivate) {
    Write-Host "3. 选择 'Private' 仓库" -ForegroundColor White
} else {
    Write-Host "3. 选择 'Public' 仓库" -ForegroundColor White
}
Write-Host "4. 不要初始化 README、.gitignore 或 license（我们已经有了）" -ForegroundColor White
Write-Host "5. 点击 'Create repository'" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "创建完成后，按 Enter 继续，或输入 'q' 退出"

if ($confirm -eq 'q') {
    Write-Host "已取消" -ForegroundColor Yellow
    exit 0
}

# 添加远程仓库
Write-Host "正在添加远程仓库..." -ForegroundColor Green
git remote add origin $remoteUrl
if ($LASTEXITCODE -ne 0) {
    Write-Host "警告: 远程仓库可能已存在，尝试更新..." -ForegroundColor Yellow
    git remote set-url origin $remoteUrl
}

# 重命名分支为 main（如果当前是 master）
$currentBranch = git branch --show-current
if ($currentBranch -eq "master") {
    Write-Host "正在重命名分支为 main..." -ForegroundColor Green
    git branch -M main
}

# 推送代码
Write-Host "正在推送代码到 GitHub..." -ForegroundColor Green
git push -u origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 成功！代码已推送到 GitHub" -ForegroundColor Green
    Write-Host "仓库地址: $remoteUrl" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ 推送失败，请检查:" -ForegroundColor Red
    Write-Host "1. 是否已在 GitHub 上创建仓库" -ForegroundColor Yellow
    Write-Host "2. 是否已配置 GitHub 认证（SSH 密钥或 Personal Access Token）" -ForegroundColor Yellow
    Write-Host "3. 仓库 URL 是否正确: $remoteUrl" -ForegroundColor Yellow
}

