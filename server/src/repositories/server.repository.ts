import { prisma } from './prisma.js';

export class ServerRepository {
  static async upsertServer(data: { id: string; name: string; icon?: string; ownerId?: string }) {
    return prisma.discordServer.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        icon: data.icon,
        ownerId: data.ownerId,
      },
      create: {
        id: data.id,
        name: data.name,
        icon: data.icon,
        ownerId: data.ownerId,
      },
    });
  }

  static async findAllServers() {
    return prisma.discordServer.findMany({
      include: {
        channels: true,
        commandConfigs: true,
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  static async findServerById(id: string) {
    return prisma.discordServer.findUnique({
      where: { id },
      include: {
        channels: true,
        commandConfigs: true,
      },
    });
  }

  static async upsertChannel(data: {
    id: string;
    serverId: string;
    name: string;
    type: string;
    isPrimary?: boolean;
    isMirror?: boolean;
  }) {
    return prisma.discordChannel.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        type: data.type,
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.isMirror !== undefined && { isMirror: data.isMirror }),
      },
      create: {
        id: data.id,
        serverId: data.serverId,
        name: data.name,
        type: data.type,
        isPrimary: data.isPrimary ?? false,
        isMirror: data.isMirror ?? false,
      },
    });
  }

  static async setChannelFlags(serverId: string, channelId: string, isPrimary: boolean, isMirror: boolean) {
    if (isPrimary) {
      await prisma.discordChannel.updateMany({
        where: { serverId },
        data: { isPrimary: false },
      });
    }
    if (isMirror) {
      await prisma.discordChannel.updateMany({
        where: { serverId },
        data: { isMirror: false },
      });
    }

    return prisma.discordChannel.update({
      where: { id: channelId },
      data: { isPrimary, isMirror },
    });
  }
}
