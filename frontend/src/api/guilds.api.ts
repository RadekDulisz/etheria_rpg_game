import type { GuildDetails, GuildSummary, GuildWar } from '../types/game';
import { httpClient } from './http';

export async function listGuilds(): Promise<GuildSummary[]> {
  return (await httpClient.get<GuildSummary[]>('/guilds')).data;
}

export async function getMyGuild(): Promise<GuildDetails | null> {
  return (await httpClient.get<GuildDetails | null>('/guilds/me')).data;
}

export async function createGuild(input: { name: string; description?: string }): Promise<GuildDetails> {
  return (await httpClient.post<GuildDetails>('/guilds', input)).data;
}

export async function joinGuild(guildId: string): Promise<GuildDetails> {
  return (await httpClient.post<GuildDetails>(`/guilds/${guildId}/join`)).data;
}

export async function leaveGuild(): Promise<void> {
  await httpClient.post('/guilds/me/leave');
}

export async function transferGuildLeadership(characterId: string): Promise<GuildDetails> {
  return (await httpClient.post<GuildDetails>(`/guilds/me/leadership/${characterId}`)).data;
}

export async function removeGuildMember(characterId: string): Promise<GuildDetails> {
  return (await httpClient.delete<GuildDetails>(`/guilds/me/members/${characterId}`)).data;
}

export async function listMyGuildWars(): Promise<GuildWar[]> {
  return (await httpClient.get<GuildWar[]>('/guilds/me/wars')).data;
}

export async function declareGuildWar(targetGuildId: string): Promise<GuildWar> {
  return (await httpClient.post<GuildWar>(`/guilds/me/wars/${targetGuildId}`)).data;
}

export async function resolveGuildWar(warId: string): Promise<GuildWar> {
  return (await httpClient.post<GuildWar>(`/guilds/wars/${warId}/resolve`)).data;
}
