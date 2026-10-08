!macro customInstall
  WriteRegStr HKCU "Software\Google\Chrome\NativeMessagingHosts\io.dynamicbridge.winpilot" "" "$INSTDIR\resources\native-host\io.dynamicbridge.winpilot.json"
  WriteRegStr HKCU "Software\Microsoft\Edge\NativeMessagingHosts\io.dynamicbridge.winpilot" "" "$INSTDIR\resources\native-host\io.dynamicbridge.winpilot.json"
!macroend

!macro customUnInstall
  ${IfNot} ${isUpdated}
    DeleteRegKey HKCU "Software\Google\Chrome\NativeMessagingHosts\io.dynamicbridge.winpilot"
    DeleteRegKey HKCU "Software\Microsoft\Edge\NativeMessagingHosts\io.dynamicbridge.winpilot"
    Delete "$APPDATA\WinPilot\native-messaging\io.dynamicbridge.winpilot.json"
    Delete "$APPDATA\WinPilot\native-messaging\io.dynamicbridge.winpilot.json.tmp"
    RMDir "$APPDATA\WinPilot\native-messaging"
  ${EndIf}
!macroend
