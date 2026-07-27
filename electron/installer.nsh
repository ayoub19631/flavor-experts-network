; Custom NSIS Installer Script for FlavorExperts
; This file is included by electron-builder during Windows packaging

!macro customHeader
  !system "echo Building FlavorExperts installer..."
!macroend

!macro customInit
  ; Check for minimum Windows version (Windows 10)
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "CurrentMajorVersionNumber"
  ${If} $0 < 10
    MessageBox MB_OK|MB_ICONEXCLAMATION "يتطلب هذا البرنامج Windows 10 أو أحدث."
    Abort
  ${EndIf}
!macroend

!macro customInstall
  ; Create additional shortcuts
  CreateShortCut "$DESKTOP\خبراء النكهات.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!macroend

!macro customUnInstall
  ; Clean up app data on uninstall (optional - only if user confirms)
  MessageBox MB_YESNO "هل تريد حذف بيانات التطبيق المحفوظة أيضاً؟" IDNO skip_data_delete
    RMDir /r "$APPDATA\flavorexperts-desktop"
  skip_data_delete:
!macroend
