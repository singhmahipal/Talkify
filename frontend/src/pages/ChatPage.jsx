import { useEffect, useState } from "react";
import { useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import {
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

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  const { authUser } = useAuthUser();

  const { data: tokenData, isError: tokenError, error: tokenErrorObject } = useQuery({
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

      if (!authUser || !tokenData?.token || !targetUserId) {
        console.log("Missing prerequisites:", { authUser, tokenData, targetUserId });
        setLoading(false);
        return;
      }

      try {
        const client = StreamChat.getInstance(STREAM_API_KEY);
        await client.connectUser({
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        }, tokenData.token);

        const channelId = [authUser._id, targetUserId].sort().join("-");
        const currChannel = client.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        await currChannel.watch();
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
  }, [authUser, tokenData, targetUserId, tokenError, tokenErrorObject]);

  const handleVideoCall = () => {
    if (!channel) return;
    const callUrl = `${window.location.origin}/call/${channel.id}`;
    channel.sendMessage({ text: `Join video call: ${callUrl}` });
    toast.success("Video call link sent!");
  };

  if (loading) return <ChatLoader />;
  if (tokenError) return <div>Error loading chat. Try again later.</div>;
  if (!chatClient || !channel) return <div>Unable to initialize chat.</div>;

  return (
    <div className="h-[93vh]">
      <Chat client={chatClient}>
        <Channel channel={channel}>
          <div className="w-full relative">
            <CallButton handleVideoCall={handleVideoCall} />
            <Window>
              <ChannelHeader />
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
