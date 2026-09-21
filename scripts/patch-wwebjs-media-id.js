/**
 * Drop __x_id from outgoing message options when sending media.
 *
 * Background: In WhatsApp Web build 2.3000.1047775310+ (September 2026),
 * `mediaOptions` returned by `processMediaData` carries an internal `__x_id` property.
 * Spreading `mediaOptions` into the outgoing `message` object causes `Msg.initialize`
 * in WhatsApp Web to fail on `getValidatedSender` with:
 *
 *   Error: Data passed to getter must include an id property (it's how we memoize) but got undefined
 *
 * This breaks sending any media (image, video, audio, document) on whatsapp-web.js 1.34.7.
 * Plain text messages are unaffected.
 *
 * Upstream PR: wwebjs/whatsapp-web.js#201923
 *
 * The fix deletes `message.__x_id` right after the outgoing message object is constructed,
 * ensuring `Msg` initializes cleanly with its real `newMsgKey`.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_WWJS = path.join(__dirname, '..', 'node_modules', 'whatsapp-web.js');
const UTILS_PATH = path.join('src', 'util', 'Injected', 'Utils.js');

const TARGET_FIND = `            ...botOptions,
            ...extraOptions,
        };

        // Bot's won't reply if canonicalUrl is set (linking)`;

const TARGET_REPLACE = `            ...botOptions,
            ...extraOptions,
        };

        // MediaData is a model whose private __x_id field collides with Msg's
        // internal id field when its enumerable properties are spread above,
        // breaking getValidatedSender() during Msg initialization (#201923).
        delete message.__x_id;

        // Bot's won't reply if canonicalUrl is set (linking)`;

function occurrences(source, needle) {
  return source.split(needle).length - 1;
}

function isApplied(wwjsDir = DEFAULT_WWJS) {
  try {
    const source = fs.readFileSync(path.join(wwjsDir, UTILS_PATH), 'utf8');
    return occurrences(source, TARGET_REPLACE) === 1 && occurrences(source, TARGET_FIND) === 0;
  } catch {
    return true;
  }
}

function applyMediaIdFix(wwjsDir = DEFAULT_WWJS) {
  const utilsFile = path.join(wwjsDir, UTILS_PATH);
  if (!fs.existsSync(utilsFile)) {
    throw new Error(`whatsapp-web.js Utils.js not found at ${utilsFile}`);
  }

  const source = fs.readFileSync(utilsFile, 'utf8');
  const findCount = occurrences(source, TARGET_FIND);
  const replaceCount = occurrences(source, TARGET_REPLACE);

  if (findCount === 0 && replaceCount === 1) {
    return {
      skipped: true,
      reason: 'installed whatsapp-web.js already deletes message.__x_id',
    };
  }
  if (findCount !== 1 || replaceCount !== 0) {
    throw new Error(
      `unsupported Utils.js shape (target calls: ${findCount}, replacement calls: ${replaceCount}); ` +
        're-evaluate the media id fix against the installed whatsapp-web.js',
    );
  }

  fs.writeFileSync(utilsFile, source.replace(TARGET_FIND, TARGET_REPLACE));
  return { skipped: false, note: 'deleted message.__x_id after outgoing message construction' };
}

function run() {
  const bestEffort = process.argv.includes('--best-effort');
  try {
    const result = applyMediaIdFix();
    console.log(`patch-wwebjs-media-id: ${result.skipped ? `skipped — ${result.reason}` : result.note}`);
  } catch (error) {
    if (bestEffort) {
      console.warn(`patch-wwebjs-media-id: skipped — ${error.message}`);
      return;
    }
    console.error(`patch-wwebjs-media-id: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) run();

module.exports = { applyMediaIdFix, isApplied, TARGET_FIND, TARGET_REPLACE };
