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
      backgroundColor: theme.tokens.color.textSecondary,
      opacity: 0.45,
    },
    sheet: {
      borderTopLeftRadius: theme.tokens.radius.xl,
      borderTopRightRadius: theme.tokens.radius.xl,
      borderWidth: 1,
      borderColor: theme.tokens.color.border,
      backgroundColor: theme.tokens.color.surface,
      padding: theme.tokens.spacing[4],
      shadowColor: theme.tokens.elevation.overlay.shadowColor,
      shadowOpacity: theme.tokens.elevation.overlay.shadowOpacity,
      shadowRadius: theme.tokens.elevation.overlay.shadowRadius,
      shadowOffset: theme.tokens.elevation.overlay.shadowOffset,
      elevation: theme.tokens.elevation.overlay.elevation,
    },
  });
