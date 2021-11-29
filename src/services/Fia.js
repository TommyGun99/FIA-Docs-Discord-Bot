const Client = require("../utils/Client");
const Moment = require("moment");
const Config = require("../config.json");
const Log = require("../utils/Log");
const { MessageEmbed } = require("discord.js");
const Database = require("../utils/Database");
const { ObjectId } = require("mongodb");

const makeEmbed = (document, event, guild) => {
  const embed = new MessageEmbed();
  embed.setTitle(document.title);
  embed.setColor(11615);
  embed.setAuthor("FIA Document - " + event.name);
  embed.setDescription("");
  embed.setFooter(Moment(document.date).format("lll"));
  embed.setURL(document.url);
  embed.setThumbnail(guild.thumbnail);
  return embed;
};

const updateDocuments = async () => {
  Client.user.setActivity({ type: "LISTENING", name: "for new Docs" });
  const documents = Database.documents.find(
    { isNew: true },
    { sort: { date: 1 } }
  );
  await documents.forEach(async (document) => {
    const guilds = Database.guilds.find({ channel: { $gt: "" } });
    const event = await Database.events.findOne(new ObjectId(document.event));
    await guilds.forEach(async (guild) => {
      await messageOnThread(guild, document.event, {
        embeds: [makeEmbed(document, event, guild)],
      });
    });
    Database.documents.updateOne(
      { _id: document._id },
      { $unset: { isNew: "" } }
    );
  });
  Client.user.setActivity({ type: "PLAYING", name: "Idle" });
};

const messageOnThread = async (guild, event, message) => {
  let thread = await getThread(guild, event);
  if (thread === null) {
    thread = await createThread(guild, event);
  }
  const channel = await Client.channels.fetch("" + thread.id, { cache: true });
  await channel.send(message);
};

const createThread = async (guild, event) => {
  const dbGuild = await Database.guilds.findOne({
    id: guild.id,
    channel: { $gt: "" },
  });
  console.log(dbGuild);
  if (dbGuild === null) return null;
  const dbEvent = await Database.events.findOne(new ObjectId(event));
  const channel = Client.channels.cache.get(dbGuild.channel);
  const thread = await channel.threads.create({
    name: dbEvent.name,
    reason: "Created by FIA-Discord-Bot",
  });
  await Database.threads.insertOne({
    guild: dbGuild.id,
    event: dbEvent._id.toString(),
    id: thread.id,
  });
  return thread.id;
};

const getThread = async (guild, event) => {
  const dbThread = await Database.threads.findOne({
    guild: guild.id,
    event: event.toString(),
  });
  return dbThread;
};

Client.on("ready", () => {
  Log.Info("Checking documents every " + Config.fetchInterval + " Seconds.");
  updateDocuments();
  setInterval(updateDocuments, Config.fetchInterval * 1000);
});
