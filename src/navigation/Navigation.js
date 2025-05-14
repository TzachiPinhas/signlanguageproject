import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useTheme } from '../contexts/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../styles/theme';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ResultsScreen from '../screens/ResultsScreen';
import CameraScreen from '../screens/CameraScreen';
import LoginScreen from '../screens/LoginScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

// Stack for the translation section
function TranslationStack() {
  const { theme: COLORS } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Camera">
        {(props) => <CameraScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen name="Results" component={ResultsScreen} />
    </Stack.Navigator>
  );
}

// Authentication Stack
function AuthenticationStack() {
  const { theme: COLORS } = useTheme();
  
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// Create styles outside components
const createStyles = () => StyleSheet.create({
  tabBar: {
    height: 70,
    borderTopWidth: 0,
    elevation: 10,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.tiny,
  },
  tabIconContainerFocused: {
    borderRadius: 16,
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
  },
  tabIconText: {
    fontSize: 22,
    marginBottom: SPACING.tiny,
  },
  tabIconTextFocused: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.caption,
  },
  loadingContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  }
});

// Custom tab bar icon
const TabIcon = ({ focused, icon, label, color }) => {
  const { theme: COLORS } = useTheme();
  const styles = createStyles();
  
  return (
    <View style={[
      styles.tabIconContainer,
      focused ? { ...styles.tabIconContainerFocused, backgroundColor: COLORS.primaryLight } : null
    ]}>
      <Text style={[
        styles.tabIconText, 
        focused ? styles.tabIconTextFocused : null
      ]}>
        {icon}
      </Text>
      <Text style={[
        styles.tabLabel, 
        { color: focused ? COLORS.primary : COLORS.textSecondary },
        focused ? { fontWeight: TYPOGRAPHY.semiBold } : null
      ]}>
        {label}
      </Text>
    </View>
  );
};

// Main navigation
export default function Navigation() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isDarkMode, theme: COLORS } = useTheme();
  const styles = createStyles();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
      setIsLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  // Create navigation theme based on dark mode setting
  const navigationTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: COLORS.background,
      card: COLORS.card,
      text: COLORS.text,
      primary: COLORS.primary,
    },
  };
  
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <Text style={{ color: COLORS.text }}>Loading...</Text>
      </View>
    );
  }
  
  return (
    <NavigationContainer theme={navigationTheme}>
      {isSignedIn ? (
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: { 
              ...styles.tabBar, 
              backgroundColor: COLORS.card,
              shadowColor: COLORS.shadow 
            },
            tabBarShowLabel: false,
          }}
        >
          <Tab.Screen 
            name="Translation" 
            component={TranslationStack} 
            options={{ 
              tabBarIcon: ({ focused, color }) => (
                <TabIcon 
                  focused={focused} 
                  icon="🔄" 
                  label="Translate"
                  color={color}
                />
              )
            }}
          />
          <Tab.Screen 
            name="History" 
            component={HistoryScreen} 
            options={{ 
              tabBarIcon: ({ focused, color }) => (
                <TabIcon 
                  focused={focused} 
                  icon="📚" 
                  label="History"
                  color={color}
                />
              )
            }}
          />
          <Tab.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{ 
              tabBarIcon: ({ focused, color }) => (
                <TabIcon 
                  focused={focused} 
                  icon="⚙️" 
                  label="Settings"
                  color={color}
                />
              )
            }}
          />
        </Tab.Navigator>
      ) : (
        <AuthenticationStack />
      )}
    </NavigationContainer>
  );
}