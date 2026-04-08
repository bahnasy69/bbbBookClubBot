require('dotenv').config();
const fs = require('fs');
const { 
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ActivityType, MessageFlags 
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent 
  ]
});

const PROTECTED_USER_ID = '1489600439581151403'; // bhnso

// --- DATABASE LOGIC ---
const loadData = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const saveData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Helper to extract ID from a message link if provided
const extractId = (str) => {
  const matches = String(str).match(/\d{17,20}/g);
  return matches ? matches[matches.length - 1] : String(str).trim();
};

// --- COMMAND DEFINITIONS ---
const commands = [
  new SlashCommandBuilder().setName('slap').setDescription('smack someone 💥').addUserOption(o => o.setName('target').setDescription('...').setRequired(true)),
  new SlashCommandBuilder().setName('throw').setDescription('throw tomatoes at someone 🍅').addUserOption(o => o.setName('target').setDescription('...').setRequired(true)),
  new SlashCommandBuilder().setName('orgasm').setDescription('umm...'),
  new SlashCommandBuilder().setName('deslump').setDescription('manifest a baddie get out of slump 📚😁').addUserOption(o => o.setName('target').setDescription('slumped user').setRequired(true)),
  new SlashCommandBuilder().setName('slump').setDescription('manifest a baddie gets into a slump 📚😈').addUserOption(o => o.setName('target').setDescription('target user').setRequired(true)),
  new SlashCommandBuilder().setName('gay').setDescription('declare someone is gay asf').addUserOption(o => o.setName('target').setDescription('target user').setRequired(true)),
  new SlashCommandBuilder().setName('predict').setDescription('share secret theories and predictions').addStringOption(o => o.setName('theory').setDescription('your prediction').setRequired(true)).addIntegerOption(o => o.setName('percent').setDescription('how far are u in %').setRequired(true)),
  new SlashCommandBuilder().setName('currentread').setDescription('what our cr book is 📖'),
  new SlashCommandBuilder().setName('archive').setDescription('see the book club history 📜'),
  new SlashCommandBuilder().setName('help').setDescription('commands list🤖'),
  new SlashCommandBuilder().setName('warn').setDescription('.').addUserOption(o => o.setName('target').setDescription('.').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('.').setRequired(true)),
  new SlashCommandBuilder().setName('timeout').setDescription('.').addUserOption(o => o.setName('target').setDescription('.').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('.').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('.').setRequired(false)),
  new SlashCommandBuilder().setName('setbook').setDescription('.').addStringOption(o => o.setName('id').setDescription('.').setRequired(true)).addStringOption(o => o.setName('title').setDescription('.').setRequired(true)).addStringOption(o => o.setName('author').setDescription('.').setRequired(true)).addStringOption(o => o.setName('synopsis').setDescription('.').setRequired(true)).addStringOption(o => o.setName('cover').setDescription('.').setRequired(false)).addStringOption(o => o.setName('deadline').setDescription('.').setRequired(false)),
  new SlashCommandBuilder().setName('setcr').setDescription('.').addStringOption(o => o.setName('id').setDescription('.').setRequired(true)),
  new SlashCommandBuilder().setName('ratebook').setDescription('.').addStringOption(o => o.setName('id').setDescription('.').setRequired(true)).addStringOption(o => o.setName('color').setDescription('.').setRequired(false)).addRoleOption(o => o.setName('role').setDescription('.').setRequired(false)),
  new SlashCommandBuilder().setName('endpoll').setDescription('.').addStringOption(o => o.setName('msg_id').setDescription('.').setRequired(true)),
  new SlashCommandBuilder().setName('stats').setDescription('.').addStringOption(o => o.setName('msg_id').setDescription('.').setRequired(true)),
  new SlashCommandBuilder().setName('removevote').setDescription('.').addStringOption(o => o.setName('msg_id').setDescription('.').setRequired(true)).addUserOption(o => o.setName('user').setDescription('.').setRequired(true)),
  new SlashCommandBuilder().setName('reveal').setDescription('.').addStringOption(o => o.setName('id').setDescription('.').setRequired(true)),
  new SlashCommandBuilder().setName('pickpoll').setDescription('.').addStringOption(o => o.setName('options').setDescription('books separated by commas').setRequired(true)).addUserOption(o => o.setName('target').setDescription('who needs help picking?').setRequired(false)),
  new SlashCommandBuilder().setName('setup-roles').setDescription('.').addChannelOption(o => o.setName('channel').setDescription('.').setRequired(true)).addRoleOption(o => o.setName('picks').setDescription('.').setRequired(true)).addRoleOption(o => o.setName('archive').setDescription('.').setRequired(true)).addRoleOption(o => o.setName('rating').setDescription('.').setRequired(true)).addRoleOption(o => o.setName('announcements').setDescription('.').setRequired(true)),
  new SlashCommandBuilder().setName('minion').setDescription('.').addStringOption(o => o.setName('trigger').setDescription('.').setRequired(true)).addStringOption(o => o.setName('reply').setDescription('.').setRequired(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try { await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands }); } catch (e) { console.error(e); }
})();

// FIXED: Changed 'ready' to 'clientReady' to remove deprecation warning
client.once('clientReady', () => {
  client.user.setActivity({ name: 'Custom Status', state: "managing bhnso's book baddies 🔧", type: ActivityType.Custom });
  console.log('bbbBOT online');
});

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function formatRatingValue(value) {
  if (value === 'dnf') return "DNF'd";
  if (value === 'read') return 'read';
  return `${value} ⭐`;
}

function buildBar(percent) {
  const filled = Math.max(0, Math.min(10, Math.round(percent / 10)));
  return `\`${'█'.repeat(filled)}${'░'.repeat(10 - filled)}\``;
}

function getRatingEmbed(pollId) {
  const db = loadData('./database.json');
  db.polls = db.polls || {};
  const poll = db.polls[pollId];
  if (!poll) return new EmbedBuilder().setDescription(`Poll data missing for ID: ${pollId}`);

  const votes = Object.entries(poll.votes || {});
  const numericVotes = votes
    .filter(([_, v]) => typeof v === 'number' && !Number.isNaN(v))
    .map(([_, v]) => v);

  const avg = numericVotes.length
    ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(2)
    : '0.00';

  const totalVotes = votes.length;

  const limitField = (text, limit = 1024) => {
    if (text.length <= limit) return text;
    return `${text.slice(0, limit - 15)}\n...and more`;
  };

  const membersList = votes.length
    ? votes
        .map(([u, r]) => `> <@${u}>: ${formatRatingValue(r)}`)
        .join('\n')
    : '*no one voted yet*';

  const breakdown = numericVotes.length
    ? [...new Set(numericVotes)]
        .sort((a, b) => b - a)
        .map((rating) => {
          const count = numericVotes.filter((v) => v === rating).length;
          const percent = Math.round((count / numericVotes.length) * 100);
          return `${buildBar(percent)} ${rating}⭐ | ${percent}% | ${count} votes`;
        })
        .join('\n')
    : '*no numeric ratings yet*';

  const embed = new EmbedBuilder()
    .setTitle(`Stats for ${poll.title}`)
    .setAuthor({ name: poll.author })
    .setColor(poll.color || '#000000')
    .addFields(
      { name: 'average rating', value: `**${avg} ⭐**`, inline: true },
      { name: 'total baddies read', value: `**${totalVotes}**`, inline: true },
      { name: 'baddies ratings', value: limitField(membersList) },
      { name: 'breakdown', value: limitField(breakdown) }
    );

  if (poll.cover) embed.setThumbnail(poll.cover);
  return embed;
}

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const db = loadData('./database.json');
  if (db.minions) {
    const content = message.content.toLowerCase();
    for (const [trigger, reply] of Object.entries(db.minions)) {
      if (content.includes(trigger)) { return message.reply(reply); }
    }
  }
  const alwaysReact = ['1489941000431603782', '1489978901382828042', '1489941158808522754', '1489941396097077248', '1489941072795799684', '1489941568180719770'];
  if (alwaysReact.includes(message.channel.id)) { await message.react('😻').catch(() => {}); }
  const mediaOnlyReact = ['1489986640934867005', '1490400064403931150'];
  if (mediaOnlyReact.includes(message.channel.id)) {
    if (/https?:\/\//.test(message.content) || message.attachments.size > 0) { await message.react('😻').catch(() => {}); }
  }
});

client.on('interactionCreate', async i => {
  const author = `<@${i.user.id}>`;
  if (i.isChatInputCommand()) {
    // Initialize DB keys to prevent crashes
    const db = loadData('./database.json');
    db.polls = db.polls || {};
    db.predictions = db.predictions || {};
    db.pickpolls = db.pickpolls || {};
    db.minions = db.minions || {};

    const isBhnso = i.user.id === PROTECTED_USER_ID;
    const adminCmds = ['endpoll', 'pickpoll', 'reveal', 'minion', 'warn', 'timeout', 'setbook', 'setcr', 'ratebook', 'setup-roles', 'removevote', 'stats'];
    if (adminCmds.includes(i.commandName) && !isBhnso) return i.reply({ content: 'nah. you are not grand daddy bhnso.', flags: MessageFlags.Ephemeral });

    if (i.commandName === 'ratebook') {
      const books = loadData('./books.json');
      const book = books.library[i.options.getString('id')];
      if (!book) return i.reply('invalid book id.');
      const rows = [];
      let row = new ActionRowBuilder();
      for (let r = 0; r <= 5; r += 0.25) {
        row.addComponents(new ButtonBuilder().setCustomId(`rate_${r}`).setLabel(`${r}⭐`).setStyle(ButtonStyle.Secondary));
        if (row.components.length === 5 && r !== 5) { rows.push(row); row = new ActionRowBuilder(); }
      }
      row.addComponents(new ButtonBuilder().setCustomId('rate_dnf').setLabel('DNF').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('rate_read').setLabel('read').setStyle(ButtonStyle.Primary));
      rows.push(row);
      
      const response = await i.reply({ content: 'setting up...', withResponse: true });
      let msgId = response?.resource?.message?.id || response?.resource?.message?.reference?.messageId || response?.resource?.message?.messageId;
      if (!msgId) {
        try {
          msgId = (await i.fetchReply()).id;
        } catch (_) {}
      }
      if (!msgId) return i.editReply({ content: 'failed to create poll.' });

      db.polls[msgId] = { bookId: i.options.getString('id'), title: book.title, author: book.author, cover: book.cover, color: i.options.getString('color'), active: true, votes: {} };
      saveData('./database.json', db);
      return i.editReply({ content: null, embeds: [getRatingEmbed(msgId)], components: rows });
    }

    if (i.commandName === 'slap') {
      const target = i.options.getUser('target');
      const tName = `<@${target.id}>`;
      if (target.id === PROTECTED_USER_ID) return i.reply(pick([`nah. ${tName} is protected by the book gods. try again gang.`, `🚫 absolutely not. ${tName} is OFF LIMITS.`, `you tried slapping ${tName}, but i stopped you.`, `woahh thats crazy. unfortunately ${tName} cannot be slapped.`, `you tried slapping bhnso but you are now bald instead.`, `you tried slapping bhnso but looks like you slapped yourself instead. loser`]));
      return i.reply(pick([`${author} slapped ${tName}.`, `💥 ${author} slapped ${tName}.`, `💥 ${author} slapped ${tName}.`, `💥 ${author} slapped ${tName}.`, `💥 ${author} slapped ${tName}.`, `👋 ${author} just smacked ${tName}.`, `😶 ${tName} got slapped by ${author}.`, `💀 ${author} did not hesitate to slap ${tName}.`, `⚡ ${author} slapped ${tName} for absolutely no reason.`, `😢 ${tName} is crying cuz ${author} slapped the shit out of them.`]));
    }



    if (interaction.commandName === 'backup') {
  await interaction.reply({
    content: 'Here is the database backup:',
    files: ['./database.json']
  });
}


    
if (interaction.commandName === 'backup2') {
  await interaction.reply({
    content: 'Here is the books backup:',
    files: ['./books.json']
  });
}






    


    
    if (i.commandName === 'throw') {
      const target = i.options.getUser('target');
      const tName = `<@${target.id}>`;
      if (target.id === PROTECTED_USER_ID) return i.reply(pick([`🍅 tomato denied. ${tName} is under full protection.`, `you tried throwing tomatoes at ${tName} but they bounced back and hit your ass instead.`, `nice try, but ${tName} is untouchable. loser.`, `🚫 no tomatoes for ${tName}. not today.`, `${author} tried throwing tomatoes. the tomatoes missed ${tName} and somehow landed on ${author}.`]));
      return i.reply(pick([`🍅 ${author} threw tomatoes at ${tName}.`, `🍅 ${author} threw tomatoes at ${tName}.`, `🍅 ${author} threw tomatoes at ${tName}.`, `🍅 ${author} threw tomatoes at ${tName}.`, `🍅 ${author} threw tomatoes at ${tName}.`, `🍅 ${author} threw tomatoes at ${tName}.`, `💀 ${tName} just got absolutely tomaTOEd by ${author}.`, `😶 ${author} fucked ${tName}'s day with tomatoes.`, `🤡 ${tName} is now covered in tomato damage thanks to ${author}.`, `🍅 ${author} said "catch" and threw at ${tName}.`, `🍅 ${tName}? more like ${tName} sauce.`]));
    }

    if (i.commandName === 'reveal') {
      const books = loadData('./books.json');
      const bookId = i.options.getString('id');
      const b = books.library[bookId];
      if (!b) return i.reply('book not found.');
      
      const preds = db.predictions[bookId] || [];
      const predList = preds.map(p => `> <@${p.user}> (${p.percent}%): ${p.text}`).join('\n') || '*no predictions shared yet.*';
      
      const embed = new EmbedBuilder()
        .setTitle(`Predictions Reveal: #${bookId} — ${b.title}`)
        .setDescription(predList)
        .setColor('#000000');
      if (b.cover) embed.setThumbnail(b.cover);
      return i.reply({ embeds: [embed] });
    }

    if (i.commandName === 'pickpoll') {
      const target = i.options.getUser('target');
      const options = i.options.getString('options').split(',').map(o => o.trim());
      const pollId = Date.now().toString();
      db.pickpolls[pollId] = { options, votes: {} };
      saveData('./database.json', db);

      const row = new ActionRowBuilder();
      options.forEach((opt, idx) => {
        row.addComponents(new ButtonBuilder().setCustomId(`pick_${pollId}_${idx}`).setLabel(`${idx + 1}`).setStyle(ButtonStyle.Secondary));
      });

      const content = `${target ? `<@${target.id}> needs help picking!\n` : ''}${options.map((o, idx) => `**${idx + 1}.** ${o}`).join('\n')}`;
      return i.reply({ content, components: [row] });
    }

    if (i.commandName === 'setup-roles') {
      const chan = i.options.getChannel('channel');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`role_picks_${i.options.getRole('picks').id}`).setLabel('📖 new book picks').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`role_archive_${i.options.getRole('archive').id}`).setLabel('📚 new books in archive').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`role_rating_${i.options.getRole('rating').id}`).setLabel('🌟 rating polls').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`role_announcements_${i.options.getRole('announcements').id}`).setLabel('📰 announcements').setStyle(ButtonStyle.Primary)
      );
      try {
        await chan.send({ content: '**Role Setup**\nClick to get your desired notifications!', components: [row] });
        return i.reply(`setup sent to <#${chan.id}>`);
      } catch (err) { return i.reply('failed to send to channel. check permissions.'); }
    }

    // FIXED: Added /stats logic block
    if (i.commandName === 'stats') {
      const mid = extractId(i.options.getString('msg_id'));
      return i.reply({ embeds: [getRatingEmbed(mid)] });
    }

    if (i.commandName === 'help') {
      return i.reply(`**HI BADDIE! 🤩 here are bhnso's book baddies' commands:**\n📖   **/currentread** : check our cr book \n📜   **/archive** : check out our book club history \n🧐   **/predict** : share secret theories and predictions of current read\n🎉   **/slap - /throw - /orgasm - /deslump - /slump - /gay **: fun stuff`);
    }

    if (i.commandName === 'archive') {
      const books = loadData('./books.json');
      let list = '';
      for (const [id, b] of Object.entries(books.library || {})) { list += `**#${id}** — *${b.title}* by ${b.author}\n`; }
      return i.reply({ embeds: [new EmbedBuilder().setTitle('📚 bbbBookClub Archive').setDescription(`${list || 'empty'}\n\n*want to see more info like average ratings and first to finish a book? head over to <#1489941072795799684>*`).setColor('#000000')] });
    }

    if (i.commandName === 'currentread') {
      const books = loadData('./books.json');
      const b = books.library[books.current];
      if (!b) return i.reply('no cr set.');
      const embed = new EmbedBuilder().setTitle(`#${books.current} — ${b.title}`).setDescription(`${b.synopsis}\n\n**deadline:** ${b.deadline || 'tbd'}\n\ncheck <#1489941158808522754> for **IMPORTANT** info`).setColor('#000000');
      if (b.cover) embed.setThumbnail(b.cover);
      return i.reply({ embeds: [embed] });
    }

    if (i.commandName === 'predict') {
        const books = loadData('./books.json');
        if (!books.current) return i.reply('no cr.');
        db.predictions[books.current] = db.predictions[books.current] || [];
        db.predictions[books.current].push({ user: i.user.id, text: i.options.getString('theory'), percent: i.options.getInteger('percent') });
        saveData('./database.json', db);
        return i.reply(`${author} submitted a theory for book #${books.current} at ${i.options.getInteger('percent')}%`);
    }

    // FIXED: Added extractId to handle message links in /endpoll and /removevote
    if (i.commandName === 'endpoll') { 
      const mid = extractId(i.options.getString('msg_id')); 
      if (db.polls[mid]) { 
        db.polls[mid].active = false; 
        saveData('./database.json', db); 
        try {
          const msg = await i.channel.messages.fetch(mid);
          const disabledRows = msg.components.map((row) =>
            new ActionRowBuilder().addComponents(
              ...row.components.map((component) => ButtonBuilder.from(component).setDisabled(true))
            )
          );
          await msg.edit({ components: disabledRows });
        } catch (_) {}
        return i.reply(`poll closed.`); 
      } 
      return i.reply(`not found (tried ID: ${mid})`); 
    }
    if (i.commandName === 'removevote') { 
      const mid = extractId(i.options.getString('msg_id')), u = i.options.getUser('user'); 
      if (db.polls[mid] && Object.prototype.hasOwnProperty.call(db.polls[mid].votes || {}, u.id)) { 
        delete db.polls[mid].votes[u.id]; 
        saveData('./database.json', db); 
        try { await i.channel.messages.fetch(mid).then(msg => msg.edit({ embeds: [getRatingEmbed(mid)] })); } catch (_) {}
        return i.reply(`removed <@${u.id}> vote.`); 
      } 
      return i.reply('not found.'); 
    }
    
    // Other admin commands
    if (i.commandName === 'warn') { return i.reply({ embeds: [new EmbedBuilder().setTitle('⚠️ WARNING').setDescription(`<@${i.options.getUser('target').id}> has been warned.\n**Reason:** ${i.options.getString('reason')}`).setColor('#FF0000')] }); }
    if (i.commandName === 'timeout') { const target = i.options.getMember('target'); const mins = i.options.getInteger('minutes'); await target.timeout(mins * 60 * 1000, i.options.getString('reason') || 'No reason').catch(() => {}); return i.reply(`<@${target.id}> timed out.`); }
    if (i.commandName === 'orgasm') return i.reply(`${author} uncontrollably had an orgasm`);
    if (i.commandName === 'deslump') return i.reply(`${'🕯️'.repeat(21)}\n🕯️ ${author} manifests <@${i.options.getUser('target').id}> gets out of their reading slump 🕯️\n${'🕯️'.repeat(21)}`);
    if (i.commandName === 'slump') return i.reply(`${'🕯️'.repeat(19)}\n🕯️ ${author} manifests <@${i.options.getUser('target').id}> gets into a reading slump 🕯️\n${'🕯️'.repeat(19)}`);
    if (i.commandName === 'gay') return i.reply(`<@${i.options.getUser('target').id}> is gay asf 🌈`);
    if (i.commandName === 'setbook') { const books = loadData('./books.json'), id = i.options.getString('id'); books.library[id] = { title: i.options.getString('title'), author: i.options.getString('author'), synopsis: i.options.getString('synopsis'), cover: i.options.getString('cover'), deadline: i.options.getString('deadline') }; saveData('./books.json', books); return i.reply(`stored #${id}`); }
    if (i.commandName === 'setcr') { const books = loadData('./books.json'); books.current = i.options.getString('id'); saveData('./books.json', books); return i.reply(`cr set to #${books.current}`); }
    if (i.commandName === 'minion') { const t = i.options.getString('trigger').toLowerCase(), r = i.options.getString('reply'); if (r.toLowerCase() === 'delete') { delete db.minions[t]; } else { db.minions[t] = r; } saveData('./database.json', db); return i.reply({ content: `updated minion.`, flags: MessageFlags.Ephemeral }); }
  }

  if (i.isButton()) {
    const db = loadData('./database.json');
    if (i.customId.startsWith('rate_')) {
      const poll = db.polls[i.message.id];
      if (!poll || !poll.active) return i.reply({ content: 'locked.', flags: MessageFlags.Ephemeral });
      const choice = i.customId.replace('rate_', '');
      const val = (choice === 'dnf' || choice === 'read') ? choice : parseFloat(choice);
      if (Number.isNaN(val)) return i.reply({ content: 'locked.', flags: MessageFlags.Ephemeral });

      if (Object.prototype.hasOwnProperty.call(poll.votes, i.user.id) && poll.votes[i.user.id] === val) {
        delete poll.votes[i.user.id];
      } else {
        poll.votes[i.user.id] = val;
      }
      saveData('./database.json', db);
      await i.message.edit({ embeds: [getRatingEmbed(i.message.id)] });
      return i.reply({ content: 'alright baddie, updated. 🫡 \nfeel free to change your rating.', flags: MessageFlags.Ephemeral });
    }
    if (i.customId.startsWith('role_')) {
      const rid = i.customId.split('_')[2]; 
      const member = await i.guild.members.fetch(i.user.id);
      if (member.roles.cache.has(rid)) { await member.roles.remove(rid); return i.reply({ content: 'removed.', flags: MessageFlags.Ephemeral }); }
      else { await member.roles.add(rid); return i.reply({ content: 'added.', flags: MessageFlags.Ephemeral }); }
    }
    if (i.customId.startsWith('pick_')) {
      const [_, pollId, idx] = i.customId.split('_'), p = db.pickpolls[pollId];
      if (!p) return i.reply({ content: 'poll over.', flags: MessageFlags.Ephemeral });
      const cIdx = parseInt(idx);
      if (p.votes[i.user.id] === cIdx) { delete p.votes[i.user.id]; } else { p.votes[i.user.id] = cIdx; }
      saveData('./database.json', db);
      const cts = {}; Object.values(p.votes).forEach(v => cts[v] = (cts[v] || 0) + 1);
      await i.message.edit({ content: p.options.map((o, x) => `**${x+1}.** ${o} — \`${cts[x] || 0} votes\``).join('\n') });
      return i.reply({ content: 'voted.', flags: MessageFlags.Ephemeral });
    }
  }
});

client.login(process.env.TOKEN);
