export type NativeControls = Pick<typeof import('react-native'), 'View' | 'Text' | 'Pressable'>;

/** Keep Node catalog tools native-free, and never enumerate React Native's lazy exports. */
export async function loadNativeControls(): Promise<NativeControls> {
  // A native namespace import eagerly initializes unrelated modules such as
  // PushNotificationIOS, whose native emitter is absent in this standalone app.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text, Pressable } = require('react-native') as NativeControls;
  return { View, Text, Pressable };
}
