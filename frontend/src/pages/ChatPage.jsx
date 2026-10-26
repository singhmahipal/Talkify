import { useEffect, useState } from "react";
import { useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import {
  Avatar as StreamAvatar,
  Channel,
  ChannelHeader,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";
import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";
import { getAvatarUrl } from "../lib/utils";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const CustomChatAvatar = (props) => {
  const sanitizedImage = getAvatarUrl(props.image, props.name);
  return <StreamAvatar {...props} image={sanitizedImage} />;
};

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  const { authUser } = useAuthUser();

  const {
    data: tokenData,
    isError: tokenError,
    error: tokenErrorObject,
    isLoading: isTokenLoading,
  } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initChat = async () => {
      if (tokenError) {
        console.error("Error fetching stream token:", tokenErrorObject);
        toast.error("Could not get stream token.");
        setLoading(false);
        return;
      }

      // Still waiting for authUser, token query, or targetUserId — keep showing loader
      if (!authUser || !targetUserId || isTokenLoading || !tokenData?.token) {
        return;
      }

      try {
        const client = StreamChat.getInstance(STREAM_API_KEY);
        await client.connectUser({
          id: authUser._id,
          name: authUser.fullName,
          image: getAvatarUrl(authUser.profilePic, authUser.fullName),
        }, tokenData.token);

        const channelId = [authUser._id, targetUserId].sort().join("-");
        const currChannel = client.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        await currChannel.watch();

        // Sanitize any member user images in channel state
        if (currChannel.state?.members) {
          Object.values(currChannel.state.members).forEach((member) => {
            if (member?.user?.image && member.user.image.includes("avatar.iran.liara.run")) {
              member.user.image = getAvatarUrl(member.user.image, member.user.name);
            }
          });
        }
        if (currChannel.data?.image && currChannel.data.image.includes("avatar.iran.liara.run")) {
          currChannel.data.image = getAvatarUrl(currChannel.data.image, currChannel.data.name);
        }

        setChatClient(client);
        setChannel(currChannel);
      } catch (err) {
        console.error("Error initializing chat:", err);
        toast.error("Could not connect to chat.");
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [authUser, tokenData, targetUserId, tokenError, tokenErrorObject, isTokenLoading]);

  const handleVideoCall = () => {
    if (!channel) return;
    const callUrl = `${window.location.origin}/call/${channel.id}`;
    channel.sendMessage({ text: `Join video call: ${callUrl}` });
    toast.success("Video call link sent!");
  };

  if (loading || isTokenLoading) return <ChatLoader />;
  if (tokenError) return <ChatLoader />;
  if (!chatClient || !channel) return <ChatLoader />;

  const otherMember = Object.values(channel?.state?.members || {}).find(
    (m) => m.user?.id !== authUser?._id
  );
  const otherUserImage = getAvatarUrl(otherMember?.user?.image, otherMember?.user?.name);

  return (
    <div className="h-[93vh]">
      <Chat client={chatClient}>
        <Channel channel={channel} Avatar={CustomChatAvatar}>
          <div className="w-full relative">
            <CallButton handleVideoCall={handleVideoCall} />
            <Window>
              <ChannelHeader image={otherUserImage} Avatar={CustomChatAvatar} />
              <MessageList />
              <MessageInput focus />
            </Window>
          </div>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};

export default ChatPage;
