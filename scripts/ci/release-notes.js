const exec = require('child_process').exec;

function execute(command) {
    return new Promise((resolve, reject) => {
        exec(command, function(error, stdout, stderr) {
            if (error) {
                reject(error, stderr);
            } else {
                resolve(stdout, stderr);
            }
        });
    });
};

const FEATURE = 'Features';
const BREAKING = 'Breaking Changes';
const FIXED = 'Bug Fixes';
const REMOVED = 'Removed';
const IMPROVEMENTS = 'Improvements';
const IGNORE = 'ignore';

const allSections = [ BREAKING, FEATURE, FIXED, IMPROVEMENTS, REMOVED];

const classMappings = {};

classMappings[FEATURE] = new Set([ 'added', 'feat', 'implemented' ]);
classMappings[BREAKING] = new Set([ 'breaking' ]);
classMappings[FIXED] = new Set([ 'fixed', 'fix' ]);
classMappings[REMOVED] = new Set([ 'removed' ]);
classMappings[IMPROVEMENTS] = new Set([ 'optimized', 'improved' ]);

const ignorePrefixes = ['ci:', 'update readme', 'updated version', 'chore:', 'revert'];

/**
 *
 * @param {string} message
 */
function classifyMessage(message) {
    message = message.trim();
    const lowerMsg = message.toLowerCase();

    for (let i = 0; i < ignorePrefixes.length; i++) {
        if (lowerMsg.startsWith(ignorePrefixes[i])) {
            return {messageClass: IGNORE, message};
        }
    }

    const idx = lowerMsg.indexOf(' ');
    if (idx < 1) {
        return {messageClass: FEATURE, message};
    }

    let firstWord = lowerMsg.substring(0, idx);
    if (firstWord.endsWith(':')) {
        firstWord = firstWord.substring(0, firstWord.length - 1);
    }

    for (let section in classMappings) {
        if (classMappings.hasOwnProperty(section)) {
            if (classMappings[section].has(firstWord)) {
                return {messageClass: section, message: message.substring(idx + 1)};
            }
        }
    }
    return {messageClass: FEATURE, message};
}

/**
 *
 * @param {Array<string>} commitMessages
 * @returns
 */
function generateReleaseNotes(commitMessages) {
    let result = '## What\'s Changed\n\n';

    const sections = new Map();

    commitMessages.forEach(commitMessage => {
        const {messageClass, message} = classifyMessage(commitMessage);
        if (!sections.has(messageClass)) {
            sections.set(messageClass, [message]);
        } else {
            sections.get(messageClass).push(message);
        }
    });

    let isFirstSection = true;
    allSections.forEach(section => {
        if (sections.has(section)) {
            if (!isFirstSection) {
                result += '\n';
            }
            result += `### ${section}\n\n`;

            sections.get(section).forEach(message => {
                result += `* ${message}\n`
            });
            isFirstSection = false;
        }
    });
    return result;
}



execute('git tag | sort -V -r | head -n 1')
.then((gitTag) => {
    if (!gitTag) {
        throw new Error('Missing git tag');
    }
    return execute(`git log --pretty=format:"%s (%h)" HEAD...${gitTag}`);
})
.then((stdout) => {
    const messages = stdout.split('\n');
    console.log(generateReleaseNotes(messages));
})
.catch(err => {
    console.error('Failed to generate release notes', err);
    process.exit(1);
});
