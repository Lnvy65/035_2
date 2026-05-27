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
  
  const [newEvent, setNewEvent] = useState({ title: "", content: "", image: null });
  const [previewImg, setPreviewImg] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["eventList"],
    queryFn: eventListApi,
    refetchOnWindowFocus: false,
  });

  const addEventMutation = useMutation({
    mutationFn: addEventApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventList"] });
      setOpenCreate(false);
      setNewEvent({ title: "", content: "", image: null });
      setPreviewImg(null);
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

  const handleOpenDetail = (event) => {
    setSelectedEvent(event);
    setOpenDetail(true);
  };

  const handleCloseDetail = () => {
    setOpenDetail(false);
    setSelectedEvent(null);
  };

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <Box sx={{ px: 2, pt: 0 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <h2 className={styles.title} style={{ margin: 0 }}>
          {user?.roles === "ADMIN" ? "이벤트 관리" : "이벤트"}
        </h2>
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
            <Card 
              key={event.SEQ} 
              variant="outlined" 
              sx={{ position: "relative", cursor: "pointer", transition: "background-color 0.2s", "&:hover": { backgroundColor: "action.hover" } }}
              onClick={() => handleOpenDetail(event)}
            >
            
              <CardContent>
                <Typography variant="h6" component="div" sx={{ fontWeight: "bold", mb: 1 }}>
                  {event.TITLE}
                </Typography>
                
                {event.IMG_NAME && (
                  <Box sx={{ my: 2 }}>
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL}/event_img/${event.IMG_NAME}`}
                      alt="event"
                      style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", objectFit: "contain" }}
                    />
                  </Box>
                )}


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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(event.SEQ);
                  }}
                  
                  sx={{ position: "absolute", top: 8, right: 8 }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Card>
          ))
        )}
      </Box>

      <Dialog open={openCreate} onClose={handleCloseCreate} maxWidth="sm" fullWidth>
        <DialogTitle>새 이벤트 등록</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Button variant="outlined" component="label" sx={{ width: "fit-content" }}>
              이미지 첨부
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </Button>
            {previewImg && (
              <Box sx={{ mt: 1, mb: 1 }}>
                <img src={previewImg} alt="preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", objectFit: "contain" }} />
              </Box>
            )}
            

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
          <Button onClick={handleCloseCreate} color="inherit">취소</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => addEventMutation.mutate(newEvent)}
            disabled={!newEvent.title || !newEvent.content || addEventMutation.isPending}
          >
            등록
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDetail} onClose={handleCloseDetail} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.5rem" }}>
          {selectedEvent?.TITLE}
        </DialogTitle>
        <DialogContent dividers>
          {selectedEvent?.IMG_NAME && (
            <Box sx={{ my: 3, textAlign: "center" }}>
              <img
                src={`${import.meta.env.VITE_API_BASE_URL}/event_img/${selectedEvent.IMG_NAME}`}
                alt="event detail"
                style={{ maxWidth: "100%", maxHeight: "500px", borderRadius: "8px", objectFit: "contain" }}
              />
            </Box>
          )}
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", mt: 2, fontSize: "1.1rem", lineHeight: 1.6 }}>
            {selectedEvent?.CONTENT}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 4, textAlign: "right" }}>
            작성일: {selectedEvent?.CREATE_DT}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDetail} variant="outlined" color="inherit">
            닫기
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
};

export default EventPage;