import { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';

import { Stream } from '@/lib/streams';
import { CommentPanel } from '@/features/social/components/comment-panel';
import { FloatingHearts } from '@/features/social/components/floating-hearts';
import { FollowButton } from '@/features/social/components/follow-button';
import { useComments } from '@/features/social/hooks/use-comments';

const { width, height } = Dimensions.get('window');

interface StreamPlayerProps {
  stream: Stream;
  isActive: boolean;
}

export default function StreamPlayer({ stream, isActive }: StreamPlayerProps) {
  const [heartTrigger, setHeartTrigger] = useState(0);
  const [inputText, setInputText] = useState('');

  const { comments, sendComment, sendEmote } = useComments(stream.id);

  const player = useVideoPlayer(stream.playback_url ?? '', (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEvent(player, 'statusChange', { status: 'idle' });
  if (isActive) {
    player.play();
  } else {
    player.pause();
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendComment(inputText.trim());
    setInputText('');
  };

  const handleHeart = () => {
    sendEmote('heart');
    setHeartTrigger((t) => t + 1);
  };

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Top bar: avatar pill + viewer count + follow */}
      <View style={styles.topBar}>
        <View style={styles.streamerPill}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.username} numberOfLines={1}>
            {stream.title || 'Untitled'}
          </Text>
        </View>
        <View style={styles.viewerCount}>
          <Text style={styles.eyeIcon}>👁</Text>
          <Text style={styles.viewerNum}>—</Text>
        </View>
        {/* userId will be wired once Member 2 exposes stream.user_id in the API */}
        <FollowButton userId={null} />
      </View>

      {/* Live comment overlay */}
      <CommentPanel comments={comments} />

      {/* Hearts float up from the heart button */}
      <FloatingHearts trigger={heartTrigger} />

      {/* Bottom row: text input + heart button */}
      <View style={styles.bottomRow}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type ..."
            placeholderTextColor="#888"
            onSubmitEditing={handleSend}
            returnKeyType="send"
            maxLength={500}
          />
          <TouchableOpacity onPress={handleSend} hitSlop={8} style={styles.sendBtn}>
            <Ionicons name="send" size={16} color={inputText.trim() ? '#fff' : '#555'} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.heartBtn} onPress={handleHeart} activeOpacity={0.7}>
          <Text style={styles.heartIcon}>❤️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width, height, backgroundColor: '#000' },
  video: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streamerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 8,
  },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#888' },
  username: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  eyeIcon: { fontSize: 16 },
  viewerNum: { color: '#fff', fontSize: 14 },
  bottomRow: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
  },
  input: { flex: 1, color: '#fff', fontSize: 14 },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF4458',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: { fontSize: 24 },
});
