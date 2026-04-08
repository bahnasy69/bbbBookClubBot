require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const PROTECTED_USER_ID = '1489600439581151403'; // bhnso

const commands = [
  new SlashCommandBuilder()
    .setName('slap')
    .setDescription('slap someone 💥')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('Who you want to slap')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('throw')
    .setDescription('Throw tomatoes at someone 🍅')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('Who you want to throw tomatoes at')
        .setRequired(true)
    ),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Commands registered!');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const target = interaction.options.getUser('target');
  const targetName = `<@${target.id}>`;
  const authorName = `<@${interaction.user.id}>`;

  // SLAP
  if (interaction.commandName === 'slap') {
    if (target.id === PROTECTED_USER_ID) {
      return interaction.reply({
        content: pick([
          `nah. ${targetName} is protected by the book gods. try again gang.`,
          `🚫 absolutely not. ${targetName} is OFF LIMITS.`,
          `you tried slapping ${targetName}, but i stopped you.`,
          `woahh thats crazy. unfortunately ${targetName} cannot be slapped.`,
          `you tried slapping bhnso but you are now bald instead.`,
          `you tried slapping bhnso but looks like you slapped yourself instead. loser`
        ]),
      });
    }

    return interaction.reply({
      content: pick([
        `${authorName} slapped ${targetName}.`,
        `💥 ${authorName} slapped ${targetName}.`,
        `💥 ${authorName} slapped ${targetName}.`,
        `💥 ${authorName} slapped ${targetName}.`,
        `💥 ${authorName} slapped ${targetName}.`,
        `👋 ${authorName} just smacked ${targetName}.`,
        `😶 ${targetName} got slapped by ${authorName}.`,
        `💀 ${authorName} did not hesitate to slap ${targetName}.`,
        `⚡ ${authorName} slapped ${targetName} for absolutely no reason.`,
        `😢 ${targetName} is crying cuz ${authorName} slapped the shit out of them.`,
      ]),
    });
  }

  // THROW
  if (interaction.commandName === 'throw') {
    if (target.id === PROTECTED_USER_ID) {
      return interaction.reply({
        content: pick([
          `🍅 tomato denied. ${targetName} is under full protection.`,
          `you tried throwing tomatoes at ${targetName} but they bounced back and hit your ass instead.`,
          `nice try, but ${targetName} is untouchable. loser.`,
          `🚫 no tomatoes for ${targetName}. not today.`,
          `${authorName} tried throwing tomatoes. the tomatoes missed ${targetName} and somehow landed on ${authorName}.`,
        ]),
      });
    }

    return interaction.reply({
      content: pick([
        `🍅 ${authorName} threw tomatoes at ${targetName}.`,
        `🍅 ${authorName} threw tomatoes at ${targetName}.`,
        `🍅 ${authorName} threw tomatoes at ${targetName}.`,
        `🍅 ${authorName} threw tomatoes at ${targetName}.`,
        `🍅 ${authorName} threw tomatoes at ${targetName}.`,
        `🍅 ${authorName} threw tomatoes at ${targetName}.`,
        `💀 ${targetName} just got absolutely tomaTOEd by ${authorName}.`,
        `😶 ${authorName} fucked ${targetName}'s day with tomatoes.`,
        `🤡 ${targetName} is now covered in tomato damage thanks to ${authorName}.`,
        `🍅 ${authorName} said "catch" and threw at ${targetName}.`,
        `🍅 ${targetName}? more like ${targetName} sauce.`,
      ]),
    });
  }
});

client.login(process.env.TOKEN);