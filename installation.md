## Nécessaire pour windows :
npm install --global windows-build-tools

## Si le build opencv ne fonctionne pas (fedora/redhat) :
```sh
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y cmake pkgconf-pkg-config git
npm i --build-from-source @u4/opencv4nodejs
```