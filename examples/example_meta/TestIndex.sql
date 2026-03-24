USE [Arkiv_test]
GO

/****** Object:  Table [dbo].[TestIndex]    Script Date: 2026-03-17 11:45:23 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[TestIndex](
	[uri] [nvarchar](500) NULL,
	[bilaga] [nvarchar](max) NULL,
	[PERSONNUMMER] [nvarchar](max) NULL,
	[DATUM] [nvarchar](max) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

