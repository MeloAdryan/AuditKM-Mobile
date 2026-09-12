import React, { useState } from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppButton from '../components/AppButton';
import { useAuth } from '../contexts/AuthContext';


export default function LoginScreen() {
  const { signIn } = useAuth();

  const [username, setUsername] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);


  async function handleLogin() {
    if (!username.trim() || !password) {
      setError(
        'Informe o usuário e a senha.',
      );

      return;
    }

    try {
      setLoading(true);
      setError(null);

      await signIn(
        username.trim(),
        password,
      );

    } catch (err) {
      console.error(
        'Erro no login:',
        err,
      );

      setError(
        'Usuário ou senha inválidos.',
      );

    } finally {
      setLoading(false);
    }
  }


  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.content}>

        <View style={styles.brandArea}>

          <View style={styles.logo}>
            <Text style={styles.logoText}>
              AK
            </Text>
          </View>

          <Text style={styles.brand}>
            AuditKM
          </Text>

          <Text style={styles.subtitle}>
            Controle, rastreamento e
            auditoria de deslocamentos
          </Text>

        </View>


        <View style={styles.card}>

          <Text style={styles.cardTitle}>
            Acessar sistema
          </Text>

          <Text style={styles.cardDescription}>
            Entre com suas credenciais
            para continuar.
          </Text>


          <Text style={styles.label}>
            Usuário
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Digite seu usuário"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />


          <Text style={styles.label}>
            Senha
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Digite sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            onSubmitEditing={handleLogin}
          />


          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          )}


          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator />

              <Text style={styles.loadingText}>
                Entrando...
              </Text>
            </View>
          ) : (
            <AppButton
              title="Entrar"
              onPress={handleLogin}
            />
          )}

        </View>


        <Text style={styles.footer}>
          AuditKM • Gestão inteligente de frota
        </Text>

      </View>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },

  brandArea: {
    alignItems: 'center',
    marginBottom: 30,
  },

  logo: {
    width: 66,
    height: 66,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D47A1',
    marginBottom: 14,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },

  brand: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0D47A1',
  },

  subtitle: {
    marginTop: 7,
    textAlign: 'center',
    color: '#78909C',
    lineHeight: 20,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
  },

  cardTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#263238',
  },

  cardDescription: {
    marginTop: 5,
    marginBottom: 22,
    color: '#78909C',
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#607D8B',
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    color: '#263238',
  },

  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 11,
    borderRadius: 8,
    marginBottom: 14,
  },

  errorText: {
    color: '#C62828',
    textAlign: 'center',
  },

  loading: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  loadingText: {
    marginLeft: 10,
    color: '#607D8B',
  },

  footer: {
    textAlign: 'center',
    color: '#90A4AE',
    fontSize: 12,
    marginTop: 24,
  },
});