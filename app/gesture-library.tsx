/**
 * Gesture Library — list the user's built-in overrides and recorded
 * custom templates, let them pick an action for each, and reset/delete.
 *
 * Recording itself is on the broadcaster laptop (press R in the
 * OpenCV preview window). This screen is the "assign an action"
 * companion that turns a freshly-recorded "unmapped" template into
 * something that actually fires.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';

import {
  ActionPickerEntry,
  BuiltinRow,
  TemplateRow,
  deleteTemplate,
  listActions,
  listBuiltins,
  listTemplates,
  resetBuiltinToDefault,
  setBuiltinOverride,
  setTemplateAction,
} from '@/lib/gestures';

const PRETTY_GESTURE: Record<string, string> = {
  open_palm: '🖐  Open palm',
  fist: '✊  Fist',
  thumbs_up: '👍  Thumbs up',
  peace: '✌️  Peace',
  finger_heart: '🤏  Finger heart',
  ily: '🤟  ILY',
};

function prettyGesture(name: string): string {
  return PRETTY_GESTURE[name] ?? name;
}

function actionLabel(actions: ActionPickerEntry[], key: string): string {
  if (key === 'unmapped') return 'Unmapped';
  return actions.find((a) => a.key === key)?.label ?? key;
}

export default function GestureLibraryScreen() {
  const router = useRouter();
  const [builtins, setBuiltins] = useState<BuiltinRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [actions, setActions] = useState<ActionPickerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Picker modal state: which row is being edited?
  type PickerTarget =
    | { kind: 'builtin'; row: BuiltinRow }
    | { kind: 'template'; row: TemplateRow }
    | null;
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, b, t] = await Promise.all([
        listActions(),
        listBuiltins(),
        listTemplates(),
      ]);
      setActions(a.actions);
      setBuiltins(b.builtins);
      setTemplates(t.templates);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // --- Mutations -----------------------------------------------------

  const onPickAction = async (target: PickerTarget, newAction: string) => {
    if (!target) return;
    setPickerTarget(null);
    try {
      if (target.kind === 'builtin') {
        await setBuiltinOverride(target.row.gesture, newAction);
      } else {
        await setTemplateAction(target.row.id, newAction);
      }
      await refresh();
    } catch (e) {
      Alert.alert('Update failed', String((e as Error).message ?? e));
    }
  };

  const onResetBuiltin = (row: BuiltinRow) => {
    if (!row.mapping_id) return;
    Alert.alert(
      'Reset to default',
      `Reset ${prettyGesture(row.gesture)} to its built-in action (${actionLabel(
        actions,
        row.default_action,
      )})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetBuiltinToDefault(row.mapping_id!);
              await refresh();
            } catch (e) {
              Alert.alert('Reset failed', String((e as Error).message ?? e));
            }
          },
        },
      ],
    );
  };

  const onDeleteTemplate = (row: TemplateRow) => {
    Alert.alert(
      'Delete template',
      `Delete the recorded gesture "${row.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplate(row.id);
              await refresh();
            } catch (e) {
              Alert.alert('Delete failed', String((e as Error).message ?? e));
            }
          },
        },
      ],
    );
  };

  // --- Render --------------------------------------------------------

  return (
    <>
      <Stack.Screen options={{ title: 'Gesture Library', headerBackTitle: 'Back' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#fff"
          />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* --- Built-ins --- */}
        <Text style={styles.sectionTitle}>Built-in gestures</Text>
        <Text style={styles.sectionHint}>
          Tap an action to remap. Reset returns a built-in to its default.
        </Text>
        {builtins.length === 0 && !loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : null}
        {builtins.map((row) => (
          <View key={row.gesture} style={styles.row}>
            <Text style={styles.rowLabel}>{prettyGesture(row.gesture)}</Text>
            <View style={styles.rowControls}>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={() => setPickerTarget({ kind: 'builtin', row })}
              >
                <Text style={styles.actionText}>
                  {actionLabel(actions, row.action)}
                </Text>
                {row.is_overridden ? (
                  <Text style={styles.overrideBadge}>•</Text>
                ) : null}
              </TouchableOpacity>
              {row.is_overridden && row.mapping_id !== null ? (
                <TouchableOpacity onPress={() => onResetBuiltin(row)}>
                  <Text style={styles.resetLink}>Reset</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))}

        {/* --- Custom templates --- */}
        <Text style={[styles.sectionTitle, { marginTop: 36 }]}>
          Your custom gestures
        </Text>
        <Text style={styles.sectionHint}>
          Recorded on the broadcaster laptop. Press R in the broadcaster
          preview to record a new one.
        </Text>
        {templates.length === 0 && !loading ? (
          <Text style={styles.muted}>
            No custom gestures yet. Press R in the broadcaster window to record.
          </Text>
        ) : null}
        {templates.map((row) => (
          <View key={row.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{row.name}</Text>
              <Text style={styles.rowMeta}>
                {row.sample_count} samples • {row.handedness} hand
              </Text>
            </View>
            <View style={styles.rowControls}>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={() => setPickerTarget({ kind: 'template', row })}
              >
                <Text
                  style={[
                    styles.actionText,
                    row.action === 'unmapped' && styles.unmappedText,
                  ]}
                >
                  {actionLabel(actions, row.action)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDeleteTemplate(row)}>
                <Text style={styles.resetLink}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* --- Action picker modal --- */}
      <Modal
        transparent
        visible={pickerTarget !== null}
        animationType="fade"
        onRequestClose={() => setPickerTarget(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPickerTarget(null)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Pick an action</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {actions.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={styles.pickerItem}
                  onPress={() => onPickAction(pickerTarget, a.key)}
                >
                  <Text style={styles.pickerItemText}>{a.label}</Text>
                  <Text style={styles.pickerCategory}>{a.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setPickerTarget(null)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingTop: 8, paddingBottom: 60 },

  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHint: { color: '#888', fontSize: 12, marginBottom: 12 },
  muted: { color: '#555', fontSize: 13, paddingVertical: 8 },

  errorBox: {
    backgroundColor: '#3a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { color: '#ffb3b3', fontSize: 13 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
  },
  rowLabel: { color: '#fff', fontSize: 15, flex: 1 },
  rowMeta: { color: '#888', fontSize: 11, marginTop: 2 },
  rowControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 4,
  },
  actionText: { color: '#fff', fontSize: 13 },
  unmappedText: { color: '#FFB800', fontStyle: 'italic' },
  overrideBadge: { color: '#4DD4FF', fontSize: 18, marginTop: -3 },
  resetLink: { color: '#FF4458', fontSize: 13 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 18,
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  pickerItemText: { color: '#fff', fontSize: 15 },
  pickerCategory: { color: '#666', fontSize: 11, textTransform: 'uppercase' },
  modalCancel: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  modalCancelText: { color: '#aaa', fontSize: 14 },
});
