import ora from 'ora';
import { TranslationClient } from './client';
import { TranslationCommandOptions } from './types';
import { formatFileSize, loadTranslationFiles } from './utils';

export async function pushTranslations(options: TranslationCommandOptions): Promise<void> {
  if (!options.secretKey) {
    throw new Error('Secret key is required. Use -s flag or set NOVU_SECRET_KEY environment variable.');
  }

  const client = new TranslationClient(options.apiUrl, options.secretKey);

  // Validate connection first
  const connectionSpinner = ora('Validating connection to Novu Cloud...').start();
  try {
    await client.validateConnection();
    connectionSpinner.succeed('Connected to Novu Cloud');
  } catch (error) {
    connectionSpinner.fail('Connection failed');
    throw error;
  }

  // Load translation files
  const loadingSpinner = ora(`Loading translation files from: ${options.directory}`).start();
  let translationFiles: Awaited<ReturnType<typeof loadTranslationFiles>>;

  try {
    translationFiles = await loadTranslationFiles(options.directory);
    loadingSpinner.succeed(`Found ${translationFiles.length} translation files`);
  } catch (error) {
    loadingSpinner.fail('Failed to load translation files');
    throw error;
  }

  if (translationFiles.length === 0) {
    console.log('\n💡 No translation files found. Expected format:');
    console.log('  • Files should be named with locale codes (e.g., en_US.json, fr_FR.json)');
    console.log('  • Files should contain valid JSON content');
    console.log(`  • Files should be located in: ${options.directory}`);

    return;
  }

  console.log(`\n📤 Pushing ${translationFiles.length} translation files to Novu Cloud...`);

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  let totalImported = 0;

  for (const file of translationFiles) {
    const spinner = ora(`Uploading ${file.locale}...`).start();

    try {
      const stats = await import('fs').then((fs) => fs.promises.stat(file.filePath));
      const response = await client.uploadMasterJson(file.filePath);

      if (response.success) {
        spinner.succeed(
          `${file.locale} → ${formatFileSize(stats.size)} (${response.imported || 0} translations imported)`
        );
        successCount++;
        totalImported += response.imported || 0;
      } else {
        spinner.fail(`${file.locale} → ${response.message}`);
        errors.push(`${file.locale}: ${response.message}`);
        errorCount++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      spinner.fail(`${file.locale} → ${errorMessage}`);
      errors.push(`${file.locale}: ${errorMessage}`);
      errorCount++;
    }
  }

  console.log('\n📊 Push Summary:');
  console.log(`✅ Successfully pushed: ${successCount} files`);
  console.log(`📝 Total translations imported: ${totalImported}`);

  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount} files`);
    console.log('\nError details:');
    for (const error of errors) {
      console.log(`  • ${error}`);
    }
  }

  if (successCount > 0) {
    console.log('\n🎉 Translations successfully uploaded to Novu Cloud!');
  }
}
