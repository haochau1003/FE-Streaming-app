import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from '../../lib/api';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, refreshProfile, logout, loading } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [dob, setDob] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setDob(user.dob || '');
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        display_name: displayName,
        email,
        bio,
        dob,
      });
      await refreshProfile();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Not logged in</Text>
        <Button title="Go to Login" onPress={() => router.push('/(auth)/login')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>
      
      <Text style={styles.label}>Username</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        value={user.username}
        editable={false}
      />

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Enter your display name"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell us about yourself"
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={dob}
        onChangeText={setDob}
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.label}>Stream Key (External)</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        value={user.stream_key || 'No key generated'}
        editable={false}
        secureTextEntry
      />

      <View style={styles.actions}>
        {isSaving ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Button title="Save Changes" onPress={handleSave} />
        )}
      </View>

      <View style={styles.logoutWrapper}>
        <Button title="Logout" onPress={handleLogout} color="red" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 60, // Avoid safe area overlap
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#888',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: 10,
    marginBottom: 30,
  },
  logoutWrapper: {
    marginTop: 20,
    marginBottom: 40,
  },
});
