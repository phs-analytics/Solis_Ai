import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { rodarAutotesteCofre, type Verificacao } from './src/autotesteCofre';

export default function App() {
  const [resultado, setResultado] = useState<Verificacao[] | null>(null);

  useEffect(() => {
    rodarAutotesteCofre().then(setResultado);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.tela}>
        <ScrollView contentContainerStyle={styles.conteudo}>
          <Text style={styles.titulo} accessibilityRole="header">
            Autoteste do banco cifrado
          </Text>
          {resultado === null ? (
            <Text style={styles.item}>Rodando…</Text>
          ) : (
            resultado.map((v) => (
              <Text key={v.nome} style={[styles.item, { color: v.ok ? '#1b6e2e' : '#b00020' }]}>
                {v.ok ? '✓ OK' : '✗ FALHOU'} — {v.nome}
                {v.detalhe ? ` (${v.detalhe})` : ''}
              </Text>
            ))
          )}
        </ScrollView>
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#fff' },
  conteudo: { padding: 16, gap: 12 },
  titulo: { fontSize: 22, fontWeight: '700', color: '#111' },
  item: { fontSize: 16, lineHeight: 22 },
});
