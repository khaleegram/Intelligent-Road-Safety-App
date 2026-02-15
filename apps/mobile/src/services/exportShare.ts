import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const buildFileName = (prefix: string): string => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${stamp}.csv`;
};

export async function shareCsvExport(params: {
  title: string;
  filePrefix: string;
  csv: string;
}): Promise<void> {
  const { title, filePrefix, csv } = params;
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  if (baseDir) {
    const fileUri = `${baseDir}${buildFileName(filePrefix)}`;
    try {
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Share.share({
        title,
        message: `${title}\n${fileUri}`,
        url: fileUri,
      });
      return;
    } catch (error) {
      console.warn('File-based export share failed, falling back to text share.', error);
    }
  }

  await Share.share({
    title,
    message: csv,
  });
}
