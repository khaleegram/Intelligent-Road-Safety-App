import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { type Theme, useTheme } from '../../theme';

type ModalSheetProps = React.PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
}>;

export default function ModalSheet({ visible, onClose, children }: ModalSheetProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>{children}</View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.color.textSecondary,
      opacity: 0.45,
    },
    sheet: {
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      padding: theme.space[4],
      shadowColor: theme.elevation.overlay.shadowColor,
      shadowOpacity: theme.elevation.overlay.shadowOpacity,
      shadowRadius: theme.elevation.overlay.shadowRadius,
      shadowOffset: theme.elevation.overlay.shadowOffset,
      elevation: theme.elevation.overlay.elevation,
    },
  });
