import 'react-native-url-polyfill/auto';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './lib/auth-context';
import { LoginScreen } from './app/screens/LoginScreen';
import { HomeScreen } from './app/screens/HomeScreen';
import { MapScreen } from './app/screens/MapScreen';
import { FriendsScreen } from './app/screens/FriendsScreen';
import { FriendProfileScreen } from './app/screens/FriendProfileScreen';
import { ProfileScreen } from './app/screens/ProfileScreen';
import { NetworkScreen } from './app/screens/NetworkScreen';
import { SearchScreen } from './app/screens/SearchScreen';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const Stack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const FriendsStack = createNativeStackNavigator();

function FriendsStackScreen() {
  return (
    <FriendsStack.Navigator screenOptions={{ headerShown: true }}>
      <FriendsStack.Screen name="FriendsList" component={FriendsScreen} options={{ title: 'Friends' }} />
      <FriendsStack.Screen name="FriendProfile" component={FriendProfileScreen} options={{ title: 'Profile' }} />
    </FriendsStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarActiveTintColor: '#e85d26',
        tabBarInactiveTintColor: '#9e9e9e',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0f0f0',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { active: TabIconName; inactive: TabIconName }> = {
            Home:    { active: 'home',              inactive: 'home-outline' },
            Network: { active: 'git-network',       inactive: 'git-network-outline' },
            Friends: { active: 'people',            inactive: 'people-outline' },
            Profile: { active: 'person-circle',     inactive: 'person-circle-outline' },
          };
          const icon = icons[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
          return <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ title: 'Home' }} />
      <Tab.Screen name="Network" component={NetworkScreen}     options={{ title: 'Network' }} />
      <Tab.Screen name="Friends" component={FriendsStackScreen} options={{ title: 'Friends', headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

/** Wraps the tab bar + screens that slide over it (Search, Map). */
function MainApp() {
  return (
    <AppStack.Navigator>
      <AppStack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <AppStack.Screen name="Search" component={SearchScreen} options={{ title: 'Search Restaurants', headerBackTitle: 'Home' }} />
      <AppStack.Screen name="Map" component={MapScreen} options={{ title: 'Map', headerBackTitle: 'Search' }} />
    </AppStack.Navigator>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#e85d26" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainApp} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
