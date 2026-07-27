@echo off
chcp 65001 >nul
echo ============================================
echo   نشر منصة Flavor Experts Network
echo   الدومين: flavorexpertsnetwork.com
echo ============================================
echo.
echo [1] افتح https://vercel.com/new
echo [2] اسحب مجلد app\frontend الى Vercel
echo [3] اضف Environment Variables من .env.production
echo [4] Deploy
echo.
echo [5] في Vercel: Settings ^> Domains ^> Add:
echo     flavorexpertsnetwork.com
echo     www.flavorexpertsnetwork.com
echo.
echo [6] في GoDaddy DNS - غيّر السجلات الى:
echo     A     @    76.76.21.21
echo     CNAME www  cname.vercel-dns.com
echo.
echo [7] في Supabase Auth URL Configuration:
echo     https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/auth/url-configuration
echo     Site URL: https://flavorexpertsnetwork.com
echo     Redirect: https://flavorexpertsnetwork.com/auth/callback
echo.
echo [8] في GoDaddy: Website Builder ^> احذف الموقع المجاني
echo.
pause
