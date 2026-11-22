import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Saves text to a file and hands it to the OS share sheet, or downloads it in a browser. */
export async function shareTextFile(fileName: string, contents: string, mimeType: string): Promise<'shared' | 'downloaded'> {
  if (Platform.OS === 'web') {
    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Export Safey data' });
  return 'shared';
}
