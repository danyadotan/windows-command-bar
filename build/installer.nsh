!macro customUnInstall
  ${IfNot} ${isUpdated}
    DeleteRegKey HKCU "Software\Google\Chrome\NativeMessagingHosts\io.dynamicbridge.winpilot"
    DeleteRegKey HKCU "Software\Microsoft\Edge\NativeMessagingHosts\io.dynamicbridge.winpilot"
    Delete "$APPDATA\WinPilot\native-messaging\io.dynamicbridge.winpilot.json"
    Delete "$APPDATA\WinPilot\native-messaging\io.dynamicbridge.winpilot.json.tmp"
    RMDir "$APPDATA\WinPilot\native-messaging"
  ${EndIf}
!macroend
