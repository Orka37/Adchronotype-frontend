module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins = [...(config.plugins || [])];
  if (iosClientId) {
    if (!iosClientId.endsWith('.apps.googleusercontent.com')) throw new Error('Invalid Google iOS client ID');
    plugins.push(['@react-native-google-signin/google-signin', {
      iosUrlScheme: `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`,
    }]);
  }
  return { ...config, plugins };
};
