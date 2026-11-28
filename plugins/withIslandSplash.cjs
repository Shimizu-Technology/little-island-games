const { withDangerousMod, IOSConfig } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

/** CNG owns these files. The SDK 57 template already registers SplashScreen.storyboard in Xcode. */
const storyboard = `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="23501" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="ISLAND-VC">
  <device id="retina6_12" orientation="portrait" appearance="light"/>
  <dependencies><plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="23501"/><capability name="Safe area layout guides" minToolsVersion="9.0"/><capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/></dependencies>
  <scenes><scene sceneID="ISLAND-SCENE"><objects>
    <viewController id="ISLAND-VC" sceneMemberID="viewController"><view key="view" contentMode="scaleToFill" id="ISLAND-VIEW">
      <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
      <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
      <subviews><imageView clipsSubviews="YES" userInteractionEnabled="NO" contentMode="scaleAspectFit" image="SplashScreen" translatesAutoresizingMaskIntoConstraints="NO" id="ISLAND-LOGO"><rect key="frame" x="96.5" y="326" width="200" height="200"/></imageView></subviews>
      <viewLayoutGuide key="safeArea" id="ISLAND-SAFE"/>
      <color key="backgroundColor" red="1" green="0.96862745098" blue="0.90196078431" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
      <constraints>
        <constraint firstItem="ISLAND-LOGO" firstAttribute="centerX" secondItem="ISLAND-VIEW" secondAttribute="centerX" id="ISLAND-X"/>
        <constraint firstItem="ISLAND-LOGO" firstAttribute="centerY" secondItem="ISLAND-VIEW" secondAttribute="centerY" id="ISLAND-Y"/>
        <constraint firstItem="ISLAND-LOGO" firstAttribute="width" constant="200" id="ISLAND-WIDTH"/>
        <constraint firstItem="ISLAND-LOGO" firstAttribute="height" constant="200" id="ISLAND-HEIGHT"/>
      </constraints>
    </view></viewController><placeholder placeholderIdentifier="IBFirstResponder" id="ISLAND-FIRST" userLabel="First Responder" sceneMemberID="firstResponder"/>
  </objects></scene></scenes>
  <resources><image name="SplashScreen" width="200" height="200"/></resources>
</document>\n`;
async function writeSplash(projectRoot, sourceRoot) {
  // Preserve the committed AB-1 bytes, including alpha; Xcode scales them into a 200pt view.
  const bytes = await fs.readFile(path.join(projectRoot, 'assets/splash-icon.png'));
  const images = path.join(sourceRoot, 'Images.xcassets', 'SplashScreen.imageset');
  await fs.mkdir(images, { recursive: true });
  await fs.writeFile(path.join(images, 'splash-icon.png'), bytes);
  await fs.writeFile(path.join(images, 'Contents.json'), JSON.stringify({ images: [{ filename: 'splash-icon.png', idiom: 'universal' }], info: { author: 'xcode', version: 1 } }, null, 2) + '\n');
  await fs.writeFile(path.join(sourceRoot, 'SplashScreen.storyboard'), storyboard);
}
module.exports = config => withDangerousMod(config, ['ios', async mod => {
  const sourceRoot = IOSConfig.Paths.getSourceRoot(mod.modRequest.projectRoot);
  await writeSplash(mod.modRequest.projectRoot, sourceRoot);
  return mod;
}]);
module.exports.writeSplash = writeSplash;
