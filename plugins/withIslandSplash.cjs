const { withDangerousMod, withInfoPlist, withXcodeProject, IOSConfig } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

/** CNG owns these files; registration is ensured independently of the Expo template. */
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
  // This generated set belongs to the plugin. Old template images are unassigned children in actool.
  await fs.rm(images, { recursive: true, force: true });
  await fs.mkdir(images, { recursive: true });
  await fs.writeFile(path.join(images, 'splash-icon.png'), bytes);
  await fs.writeFile(path.join(images, 'Contents.json'), JSON.stringify({ images: [{ filename: 'splash-icon.png', idiom: 'universal' }], info: { author: 'xcode', version: 1 } }, null, 2) + '\n');
  await fs.writeFile(path.join(sourceRoot, 'SplashScreen.storyboard'), storyboard);
}
/** Repair both a missing file and a file reference left out of the app's Resources phase. */
function ensureSplashResource(project, projectName) {
  const target = project.getTarget('com.apple.product-type.application');
  if (!target) throw new Error('Island splash: application target not found');
  const resourcePhases = project.hash.project.objects.PBXResourcesBuildPhase ?? {};
  const hasAppResources = target.target.buildPhases.some(phase => resourcePhases[phase.value]);
  if (!hasAppResources) {
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
  }
  const resources = project.pbxResourcesBuildPhaseObj(target.uuid);
  if (!resources) throw new Error('Island splash: application Resources phase not found');
  const group = IOSConfig.XcodeUtils.ensureGroupRecursively(project, projectName);
  if (!group) throw new Error('Island splash: application source group not found');
  const refs = project.pbxFileReferenceSection();
  const isSplash = child => {
    const filePath = refs[child.value]?.path?.replace(/^"|"$/g, '');
    return filePath === 'SplashScreen.storyboard' || filePath === `${projectName}/SplashScreen.storyboard`;
  };
  let child = group.children.find(isSplash);
  if (!child) {
    const groupPath = group.path?.replace(/^"|"$/g, '');
    const filepath = groupPath === projectName ? 'SplashScreen.storyboard' : `${projectName}/SplashScreen.storyboard`;
    IOSConfig.XcodeUtils.addResourceFileToGroup({ project, filepath, groupName: projectName, isBuildFile: true, targetUuid: target.uuid });
    child = group.children.find(isSplash);
  }
  if (!child) throw new Error('Island splash: storyboard file reference could not be registered');
  refs[child.value].lastKnownFileType = 'file.storyboard';
  const builds = project.pbxBuildFileSection();
  if (!resources.files.some(file => builds[file.value]?.fileRef === child.value)) {
    const existing = Object.keys(builds).find(key => !key.endsWith('_comment') && builds[key].fileRef === child.value);
    const uuid = existing ?? project.generateUuid();
    if (!existing) {
      builds[uuid] = { isa: 'PBXBuildFile', fileRef: child.value, fileRef_comment: 'SplashScreen.storyboard' };
      builds[`${uuid}_comment`] = 'SplashScreen.storyboard in Resources';
    }
    resources.files.push({ value: uuid, comment: 'SplashScreen.storyboard in Resources' });
  }
  return project;
}
module.exports = config => {
  config = withInfoPlist(config, mod => {
    mod.modResults.UILaunchStoryboardName = 'SplashScreen';
    return mod;
  });
  config = withXcodeProject(config, mod => {
    ensureSplashResource(mod.modResults, mod.modRequest.projectName ?? IOSConfig.XcodeUtils.getProjectName(mod.modRequest.projectRoot));
    return mod;
  });
  return withDangerousMod(config, ['ios', async mod => {
    const sourceRoot = IOSConfig.Paths.getSourceRoot(mod.modRequest.projectRoot);
    await writeSplash(mod.modRequest.projectRoot, sourceRoot);
    return mod;
  }]);
};
module.exports.writeSplash = writeSplash;
module.exports.ensureSplashResource = ensureSplashResource;
