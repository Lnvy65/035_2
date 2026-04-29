import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Card, CardContent, Typography, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import useAuthStore from "../store/authStore";
import { eventListApi, addEventApi, deleteEventApi } from "../api/eventApi";
import styles from "../styles/EventPage.module.css";

const EventPage = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  
  // [수정된 부분] image 상태 추가
  const [newEvent, setNewEvent] = useState({ title: "", content: "", image: null });
  const [previewImg, setPreviewImg] = useState(null);
  // [수정된 부분] 끝

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["eventList"],
    queryFn: eventListApi,
    refetchOnWindowFocus: false,
  });

  const addEventMutation = useMutation({
    mutationFn: addEventApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventList"] });
      // [수정된 부분] 등록 성공 시 상태 초기화
      setOpenCreate(false);
      setNewEvent({ title: "", content: "", image: null });
      setPreviewImg(null);
      // [수정된 부분] 끝
      alert("이벤트가 등록되었습니다.");
    },
    onError: () => {
      alert("이벤트 등록에 실패했습니다.");
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: deleteEventApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventList"] });
    },
    onError: () => {
      alert("이벤트 삭제에 실패했습니다.");
    }
  });

  const handleDelete = (seq) => {
    if (window.confirm("해당 이벤트를 삭제하시겠습니까?")) {
      deleteEventMutation.mutate({ seq });
    }
  };

  // [수정된 부분] 이미지 변경 핸들러 및 팝업 닫기 핸들러 추가
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드 가능합니다.");
        return;
      }
      setNewEvent({ ...newEvent, image: file });
      setPreviewImg(URL.createObjectURL(file));
    }
  };

  const handleCloseCreate = () => {
    setOpenCreate(false);
    setNewEvent({ title: "", content: "", image: null });
    setPreviewImg(null);
  };
  // [수정된 부분] 끝

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <Box sx={{ px: 2, pt: 0 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <h2 className={styles.title} style={{ margin: 0 }}>이벤트 관리</h2>
        {user?.roles === "ADMIN" && (
          <Button variant="outlined" size="small" onClick={() => setOpenCreate(true)}>
            이벤트 추가
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {events.length === 0 ? (
          <Typography variant="body1" color="text.secondary">등록된 이벤트가 없습니다.</Typography>
        ) : (
          events.map((event) => (
            <Card key={event.SEQ} variant="outlined" sx={{ position: "relative" }}>
              <CardContent>
                <Typography variant="h6" component="div" sx={{ fontWeight: "bold", mb: 1 }}>
                  {event.TITLE}
                </Typography>
                
                {/* [수정된 부분] 등록된 이미지가 있을 경우 화면에 표시 */}
                {event.IMG_NAME && (
                  <Box sx={{ my: 2 }}>
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL}/event_img/${event.IMG_NAME}`}
                      alt="event"
                      style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", objectFit: "contain" }}
                    />
                  </Box>
                )}
                {/* [수정된 부분] 끝 */}

                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
                  {event.CONTENT}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  등록일: {event.CREATE_DT}
                </Typography>
              </CardContent>
              {user?.roles === "ADMIN" && (
                <IconButton
                  color="error"
                  onClick={() => handleDelete(event.SEQ)}
                  sx={{ position: "absolute", top: 8, right: 8 }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Card>
          ))
        )}
      </Box>

      {/* [수정된 부분] onClose 속성에 handleCloseCreate 적용 */}
      <Dialog open={openCreate} onClose={handleCloseCreate} maxWidth="sm" fullWidth>
        <DialogTitle>새 이벤트 등록</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            
            {/* [수정된 부분] 이미지 업로드 버튼 및 미리보기 영역 추가 */}
            <Button variant="outlined" component="label" sx={{ width: "fit-content" }}>
              이미지 첨부
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </Button>
            {previewImg && (
              <Box sx={{ mt: 1, mb: 1 }}>
                <img src={previewImg} alt="preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px" }} />
              </Box>
            )}
            {/* [수정된 부분] 끝 */}

            <TextField
              label="이벤트 제목"
              fullWidth
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            />
            <TextField
              label="이벤트 내용"
              multiline
              rows={4}
              fullWidth
              value={newEvent.content}
              onChange={(e) => setNewEvent({ ...newEvent, content: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {/* [수정된 부분] 취소 버튼에 handleCloseCreate 적용 */}
          <Button onClick={handleCloseCreate} color="inherit">취소</Button>
          <Button
            variant="contained"
            onClick={() => addEventMutation.mutate(newEvent)}
            disabled={!newEvent.title || !newEvent.content || addEventMutation.isPending}
            sx={{ backgroundColor: "#000", "&:hover": { backgroundColor: "#333" } }}
          >
            등록
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventPage;