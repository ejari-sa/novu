import ora from 'ora';
import { TranslationClient } from './client';
import { TranslationCommandOptions } from './types';
import { formatFileSize, saveTranslationFile } from './utils';

const DEFAULT_LOCALES = [
  'en_US',
  'en_GB',
  'es_ES',
  'fr_FR',
  'de_DE',
  'it_IT',
  'pt_BR',
  'ja_JP',
  'ko_KR',
  'zh_CN',
  'zh_TW',
  'ru_RU',
  'ar_SA',
  'hi_IN',
  'nl_NL',
  'sv_SE',
  'da_DK',
  'no_NO',
  'fi_FI',
  'pl_PL',
];

export async function pullTranslations(options: TranslationCommandOptions): Promise<void> {
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

  console.log(`📥 Pulling translations to: ${options.directory}`);

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const locale of DEFAULT_LOCALES) {
    const spinner = ora(`Fetching ${locale}...`).start();

    try {
      const response = await client.getMasterJson(locale);

      if (response.data && Object.keys(response.data).length > 0) {
        const filePath = await saveTranslationFile(options.directory, locale, response.data);
        const stats = await import('fs').then((fs) => fs.promises.stat(filePath));

        spinner.succeed(`${locale} → ${formatFileSize(stats.size)}`);
        successCount++;
      } else {
        spinner.info(`${locale} → No translations available`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('No translations found')) {
        spinner.info(`${locale} → No translations available`);
      } else {
        spinner.fail(`${locale} → ${errorMessage}`);
        errors.push(`${locale}: ${errorMessage}`);
        errorCount++;
      }
    }
  }

  console.log('\n📊 Pull Summary:');
  console.log(`✅ Successfully pulled: ${successCount} locales`);

  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount} locales`);
    console.log('\nError details:');
    for (const error of errors) {
      console.log(`  • ${error}`);
    }
  }

  if (successCount === 0) {
    console.log('\n💡 No translation files were downloaded. This might be because:');
    console.log('  • No translations have been uploaded to your Novu workspace yet');
    console.log("  • Your API key doesn't have access to translations");
    console.log("  • You're using the wrong API URL (try -a https://eu.api.novu.co for EU)");
  } else {
    console.log(`\n🎉 Translation files saved to: ${options.directory}`);
  }
}
