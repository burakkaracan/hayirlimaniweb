@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   Hayır Limanı - GitHub'dan Çek
echo ============================================
echo.
echo UYARI: Sunucuyu (npm start) kapatmadan devam etmeyin!
echo.
set /p confirm="Sunucu kapatıldı mı? (e/h): "
if /i "%confirm%" neq "e" (
  echo İptal edildi.
  pause
  exit /b
)
echo.
git pull
echo.
echo ✓ Pull tamamlandı! Sunucuyu başlatabilirsiniz: npm start
echo.
pause
