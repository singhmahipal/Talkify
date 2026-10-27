import { useEffect, useState } from "react";
import { useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import {
  AttachmentSelector,
  Avatar as StreamAvatar,
  Channel,
  ChannelHeader,
  Chat,
  DefaultAttachmentSelectorComponents,
  MessageInput,
  MessageList,
  Thread,
  useChannelStateContext,
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

const CustomLocationButton = ({ closeMenu }) => {
  const { channel } = useChannelStateContext("CustomLocationButton");

  const handleShareLocation = () => {
    closeMenu();
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    const toastId = toast.loading("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        channel.sendMessage({
          text: `📍 Shared Location: ${mapsUrl}`,
        });
        toast.success("Location shared!", { id: toastId });
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Could not retrieve your location. Check browser permissions.", { id: toastId });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      type="button"
      className="str-chat__dialog-menu__button str-chat__attachment-selector-actions-menu__button str-chat__attachment-selector-actions-menu__add-location-button"
      onClick={handleShareLocation}
    >
      <div className="str-chat__dialog-menu__button-icon" />
      <div className="str-chat__dialog-menu__button-text">Location</div>
    </button>
  );
};

const customAttachmentActions = [
  { ActionButton: DefaultAttachmentSelectorComponents.File, type: "uploadFile" },
  { ActionButton: DefaultAttachmentSelectorComponents.Poll, type: "createPoll" },
  { ActionButton: CustomLocationButton, type: "addLocation" },
];

const CustomAttachmentSelector = (props) => (
  <AttachmentSelector
    {...props}
    attachmentSelectorActionSet={customAttachmentActions}
  />
);

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
        <Channel
          channel={channel}
          Avatar={CustomChatAvatar}
          AttachmentSelector={CustomAttachmentSelector}
        >
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
