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

  // Fetch organization settings to get configured locales
  const settingsSpinner = ora('Fetching organization locale settings...').start();
  let targetLocales: string[];
  let defaultLocale: string;

  try {
    const settings = await client.getOrganizationSettings();
    defaultLocale = settings.data.defaultLocale;
    targetLocales = [defaultLocale, ...settings.data.targetLocales];

    // Remove duplicates in case defaultLocale is also in targetLocales
    targetLocales = [...new Set(targetLocales)];

    settingsSpinner.succeed(`Found ${targetLocales.length} configured locales (default: ${defaultLocale})`);
  } catch (error) {
    settingsSpinner.warn('Organization settings not available, allowing all locales');
    console.log('💡 This might be because:');
    console.log('  • The API endpoint is not available in your environment');
    console.log("  • Your API key doesn't have the required permissions");
    console.log("  • You're using a local development environment");

    // Fallback: allow all locales (no filtering)
    defaultLocale = 'en_US';
    targetLocales = []; // Empty array means no filtering will be applied
    console.log('\n🌍 All translation files will be uploaded without locale validation');
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

  // Filter files to only include configured locales (if we have locale restrictions)
  if (targetLocales.length > 0) {
    const validFiles = translationFiles.filter((file) => targetLocales.includes(file.locale));
    const invalidFiles = translationFiles.filter((file) => !targetLocales.includes(file.locale));

    if (invalidFiles.length > 0) {
      console.log(`\n⚠️  Skipping ${invalidFiles.length} files with unconfigured locales:`);
      for (const file of invalidFiles) {
        console.log(`  • ${file.locale}.json (not in organization settings)`);
      }
      console.log(`\n🌍 Configured locales: ${targetLocales.join(', ')}`);
    }

    translationFiles = validFiles;
  } else {
    console.log(`\n📁 Processing all ${translationFiles.length} translation files found`);
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

      if (response.data.success) {
        const importedCount = response.data.successful?.length || 0;
        spinner.succeed(`${file.locale} → ${formatFileSize(stats.size)} (${importedCount} resources imported)`);
        successCount++;
        totalImported += importedCount;
      } else {
        spinner.fail(`${file.locale} → ${response.data.message || 'Upload failed'}`);
        errors.push(`${file.locale}: ${response.data.message || 'Upload failed'}`);
        errorCount++;
      }
    } catch (error) {
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        errorMessage = error.message || 'Request failed without error message';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }

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
