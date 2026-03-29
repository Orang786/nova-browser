!macro customHeader
  !system "echo '🚀 Building Nova Browser Installer...'"
!macroend

!macro preInit
  ; Проверяем, не запущен ли браузер
  nsExec::ExecToLog 'tasklist /FI "IMAGENAME eq Nova Browser.exe" /NH'
!macroend

!macro customInit
  ; Устанавливаем язык по умолчанию
!macroend

!macro customInstall
  ; Создаём ключи реестра для ассоциаций
  
  ; Регистрация как веб-браузер
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser" "" "Nova Browser"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\DefaultIcon" "" "$INSTDIR\Nova Browser.exe,0"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\shell\open\command" "" '"$INSTDIR\Nova Browser.exe"'
  
  ; Capabilities
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities" "ApplicationName" "Nova Browser"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities" "ApplicationDescription" "Быстрый и современный веб-браузер"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities" "ApplicationIcon" "$INSTDIR\Nova Browser.exe,0"
  
  ; URL Associations
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities\URLAssociations" "http" "NovaBrowserURL"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities\URLAssociations" "https" "NovaBrowserURL"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities\URLAssociations" "ftp" "NovaBrowserURL"
  
  ; File Associations
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities\FileAssociations" ".html" "NovaBrowserHTML"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities\FileAssociations" ".htm" "NovaBrowserHTML"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities\FileAssociations" ".xhtml" "NovaBrowserHTML"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities\FileAssociations" ".svg" "NovaBrowserHTML"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities\FileAssociations" ".pdf" "NovaBrowserHTML"
  
  ; Registered Applications
  WriteRegStr HKLM "Software\RegisteredApplications" "Nova Browser" "Software\Clients\StartMenuInternet\NovaBrowser\Capabilities"
  
  ; URL Protocol Handler
  WriteRegStr HKLM "Software\Classes\NovaBrowserURL" "" "Nova Browser URL"
  WriteRegStr HKLM "Software\Classes\NovaBrowserURL" "URL Protocol" ""
  WriteRegStr HKLM "Software\Classes\NovaBrowserURL\DefaultIcon" "" "$INSTDIR\Nova Browser.exe,0"
  WriteRegStr HKLM "Software\Classes\NovaBrowserURL\shell\open\command" "" '"$INSTDIR\Nova Browser.exe" "%1"'
  
  ; HTML Handler
  WriteRegStr HKLM "Software\Classes\NovaBrowserHTML" "" "Nova Browser HTML Document"
  WriteRegStr HKLM "Software\Classes\NovaBrowserHTML\DefaultIcon" "" "$INSTDIR\Nova Browser.exe,0"
  WriteRegStr HKLM "Software\Classes\NovaBrowserHTML\shell\open\command" "" '"$INSTDIR\Nova Browser.exe" "%1"'
  
  ; Создаём ярлык на рабочем столе с красивым описанием
  CreateShortCut "$DESKTOP\Nova Browser.lnk" "$INSTDIR\Nova Browser.exe" "" "$INSTDIR\Nova Browser.exe" 0
  
  ; Ярлык в быстром запуске
  CreateShortCut "$QUICKLAUNCH\Nova Browser.lnk" "$INSTDIR\Nova Browser.exe" "" "$INSTDIR\Nova Browser.exe" 0
  
!macroend

!macro customUnInstall
  ; Удаляем ключи реестра
  DeleteRegKey HKLM "Software\Clients\StartMenuInternet\NovaBrowser"
  DeleteRegValue HKLM "Software\RegisteredApplications" "Nova Browser"
  DeleteRegKey HKLM "Software\Classes\NovaBrowserURL"
  DeleteRegKey HKLM "Software\Classes\NovaBrowserHTML"
  
  ; Удаляем ярлыки
  Delete "$DESKTOP\Nova Browser.lnk"
  Delete "$QUICKLAUNCH\Nova Browser.lnk"
!macroend