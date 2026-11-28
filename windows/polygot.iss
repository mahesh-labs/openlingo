#ifndef AppVersion
  #define AppVersion "0.1.0-beta"
#endif

[Setup]
AppId={{A4D1F73C-92E8-4B61-8C45-2F7E9B3D1A80}
AppName=Polygot
AppVersion={#AppVersion}
AppPublisher=mahesh-labs
AppPublisherURL=https://mahesh-labs.github.io/polygot/
AppSupportURL=https://github.com/mahesh-labs/polygot/issues
AppUpdatesURL=https://github.com/mahesh-labs/polygot/releases
DefaultDirName={autopf}\Polygot
DefaultGroupName=Polygot
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=dist
OutputBaseFilename=Polygot-v{#AppVersion}-windows-setup
SetupIconFile=polygot.ico
UninstallDisplayIcon={app}\Polygot.exe
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
Name: "{autoprograms}\Polygot"; Filename: "{app}\Polygot.exe"; IconFilename: "{app}\Polygot.exe"
Name: "{autodesktop}\Polygot"; Filename: "{app}\Polygot.exe"; IconFilename: "{app}\Polygot.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Polygot.exe"; Description: "{cm:LaunchProgram,Polygot}"; Flags: nowait postinstall skipifsilent
