#ifndef AppVersion
  #define AppVersion "0.0.11-beta"
#endif

[Setup]
AppId={{8E92D64A-4B5F-4E91-9A2C-3F6B0C9E1D24}
AppName=OpenLingo
AppVersion={#AppVersion}
AppPublisher=mahesh-labs
AppPublisherURL=https://mahesh-labs.github.io/openlingo/
AppSupportURL=https://github.com/mahesh-labs/openlingo/issues
AppUpdatesURL=https://github.com/mahesh-labs/openlingo/releases
DefaultDirName={autopf}\OpenLingo
DefaultGroupName=OpenLingo
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=dist
OutputBaseFilename=OpenLingo-v{#AppVersion}-windows-setup
SetupIconFile=openlingo.ico
UninstallDisplayIcon={app}\OpenLingo.exe
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=force
RestartApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\stage\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\OpenLingo"; Filename: "{app}\OpenLingo.exe"; IconFilename: "{app}\OpenLingo.exe"
Name: "{autodesktop}\OpenLingo"; Filename: "{app}\OpenLingo.exe"; IconFilename: "{app}\OpenLingo.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\OpenLingo.exe"; Description: "{cm:LaunchProgram,OpenLingo}"; Flags: nowait postinstall skipifsilent
