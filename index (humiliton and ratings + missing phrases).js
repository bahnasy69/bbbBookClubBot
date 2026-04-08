require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder,
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  EmbedBuilder,
  ActivityType
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const PROTECTED_USER_ID = '1489600439581151403'; // bhnso
const polls = {}; 

const commands = [
  new SlashCommandBuilder().setName('slap').setDescription('smack someone')
    .addUserOption(o => o.setName('target').setDescription('target').setRequired(true)),
  
  new SlashCommandBuilder().setName('throw').setDescription('tomato time')
    .addUserOption(o => o.setName('target').setDescription('target').setRequired(true)),
  
  new SlashCommandBuilder().setName('ratebook').setDescription('start a book poll')
    .addStringOption(o => o.setName('book').setDescription('book title').setRequired(true))
    .addStringOption(o => o.setName('cover').setDescription('image link').setRequired(false)),
  
  new SlashCommandBuilder().setName('endpoll').setDescription('lock the rating')
    .addStringOption(o => o.setName('id').setDescription('message id').setRequired(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
  } catch (e) { console.error(e); }
})();

client.once('ready', () => {
  console.log('bot is live');
  client.user.setActivity({
    name: 'Custom Status',
    state: "managing bhnso's book baddies 🔧",
    type: ActivityType.Custom
  });
});

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function getEmbed(data) {
  const votes = Object.entries(data.votes);
  const avg = votes.length ? (votes.reduce((a, [_, r]) => a + r, 0) / votes.length).toFixed(2) : '0.00';
  const list = votes.map(([u, r]) => `> <@${u}>: **${r}** ⭐`).join('\n') || '*no ratings yet*';

  const embed = new EmbedBuilder()
    .setTitle(`📖 ${data.book}`)
    .setColor('#000000') // This creates the "True Black" look in Discord
    .addFields(
      { name: 'Average', value: `**${avg}** ⭐`, inline: true },
      { name: 'Total Votes', value: `**${votes.length}**`, inline: true },
      { name: 'Voters', value: list }
    );

  if (data.cover) embed.setThumbnail(data.cover);
  if (!data.active) embed.setFooter({ text: 'Poll locked.' });
  
  return embed;
}

client.on('interactionCreate', async i => {
  if (i.isChatInputCommand()) {
    const author = `<@${i.user.id}>`;

    if (i.commandName === 'slap' || i.commandName === 'throw') {
      const target = i.options.getUser('target');
      const targetTag = `<@${target.id}>`;

      if (target.id === PROTECTED_USER_ID) {
        return i.reply(i.commandName === 'slap' ? `nice try, but bhnso is untouchable.` : `tomatoes bounced off bhnso and hit you instead.`);
      }

      return i.reply(i.commandName === 'slap' 
        ? pick([`${author} slapped ${targetTag}`, `💥 ${author} smacked ${targetTag}`, `👋 smack from ${author} to ${targetTag}`])
        : pick([`🍅 ${author} threw a tomato at ${targetTag}`, `🍅 catch this ${targetTag}`]));
    }

    if (i.commandName === 'ratebook') {
      if (i.user.id !== PROTECTED_USER_ID) return i.reply({ content: 'only bhnso can start polls.', ephemeral: true });

      const book = i.options.getString('book');
      const cover = i.options.getString('cover');
      const rows = [];
      let row = new ActionRowBuilder();

      // Generating buttons 0-5 in 0.25 steps
      for (let r = 0; r <= 5; r += 0.25) {
        row.addComponents(new ButtonBuilder().setCustomId(`r_${r}`).setLabel(`${r} ⭐`).setStyle(ButtonStyle.Secondary));
        if (row.components.length === 5) { rows.push(row); row = new ActionRowBuilder(); }
      }
      if (row.components.length) rows.push(row);

      const msg = await i.reply({ embeds: [new EmbedBuilder().setTitle(book).setColor('#000000')], components: rows, fetchReply: true });
      polls[msg.id] = { book, cover, author: i.user.id, active: true, votes: {} };
      await i.editReply({ embeds: [getEmbed(polls[msg.id])] });
    }

    if (i.commandName === 'endpoll') {
      const id = i.options.getString('id');
      if (!polls[id] || polls[id].author !== i.user.id) return i.reply({ content: 'couldnt find that poll or u didnt start it', ephemeral: true });
      
      polls[id].active = false;
      const m = await i.channel.messages.fetch(id);
      await m.edit({ embeds: [getEmbed(polls[id])], components: [] });
      await i.reply({ content: 'poll closed.', ephemeral: true });
    }
  }

  if (i.isButton() && i.customId.startsWith('r_')) {
    const p = polls[i.message.id];
    if (!p || !p.active) return i.reply({ content: 'this poll is closed', ephemeral: true });

    const val = parseFloat(i.customId.split('_')[1]);
    const old = p.votes[i.user.id];
    p.votes[i.user.id] = val;
    
    await i.message.edit({ embeds: [getEmbed(p)] });
    
    const reply = old !== undefined && old !== val ? `updated to ${val}⭐` : `set to ${val}⭐`;
    await i.reply({ content: reply, ephemeral: true });
  }
});

client.login(process.env.TOKEN);